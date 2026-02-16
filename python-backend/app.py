from fastapi import FastAPI, UploadFile, File, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import torch
import warnings

# Suppress warnings
warnings.filterwarnings("ignore")

# Patch torch.load for PyTorch 2.6+ compatibility
import torch.serialization
original_torch_load = torch.load

def patched_torch_load(*args, **kwargs):
    kwargs['weights_only'] = False
    return original_torch_load(*args, **kwargs)

torch.load = patched_torch_load

# Now import ultralytics
from ultralytics import YOLO
import cv2
import numpy as np
import base64
import json
import asyncio
from typing import List, Dict, Optional
from datetime import datetime
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Object Tracking API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize YOLO model
logger.info("Loading YOLOv8 model...")
try:
    model = YOLO("yolov8n.pt")
    logger.info("Model loaded successfully!")
except Exception as e:
    logger.error(f"Error loading model: {e}")
    logger.info("Attempting to download model...")
    model = YOLO("yolov8n")

# Simple ID generator for tracking
class SimpleTracker:
    def __init__(self):
        self.next_id = 1
        self.objects = {}  # bbox -> id mapping (simplified)
    
    def get_id(self, bbox, class_name):
        """Simple tracking based on bbox overlap (not real DeepSORT)."""
        x1, y1, x2, y2 = bbox
        center_x = (x1 + x2) / 2
        center_y = (y1 + y2) / 2
        
        # Look for existing object with similar position
        for obj_id, (obj_center, obj_class) in self.objects.items():
            if obj_class == class_name:
                ox, oy = obj_center
                # If centers are close (within 50 pixels), consider it the same object
                if abs(center_x - ox) < 50 and abs(center_y - oy) < 50:
                    self.objects[obj_id] = ((center_x, center_y), class_name)
                    return obj_id
        
        # New object
        obj_id = self.next_id
        self.next_id += 1
        self.objects[obj_id] = ((center_x, center_y), class_name)
        return obj_id
    
    def reset(self):
        self.next_id = 1
        self.objects = {}

# COCO class names
CLASS_NAMES = [
    "person", "bicycle", "car", "motorcycle", "airplane", "bus", "train", "truck",
    "boat", "traffic light", "fire hydrant", "stop sign", "parking meter", "bench",
    "bird", "cat", "dog", "horse", "sheep", "cow", "elephant", "bear", "zebra",
    "giraffe", "backpack", "umbrella", "handbag", "tie", "suitcase", "frisbee",
    "skis", "snowboard", "sports ball", "kite", "baseball bat", "baseball glove",
    "skateboard", "surfboard", "tennis racket", "bottle", "wine glass", "cup",
    "fork", "knife", "spoon", "bowl", "banana", "apple", "sandwich", "orange",
    "broccoli", "carrot", "hot dog", "pizza", "donut", "cake", "chair", "couch",
    "potted plant", "bed", "dining table", "toilet", "tv", "laptop", "mouse",
    "remote", "keyboard", "cell phone", "microwave", "oven", "toaster", "sink",
    "refrigerator", "book", "clock", "vase", "scissors", "teddy bear", "hair drier",
    "toothbrush"
]


def base64_to_image(base64_string: str) -> np.ndarray:
    """Convert base64 string to OpenCV image."""
    # Remove data URL prefix if present
    if "," in base64_string:
        base64_string = base64_string.split(",")[1]
    
    img_data = base64.b64decode(base64_string)
    nparr = np.frombuffer(img_data, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    return img


def image_to_base64(image: np.ndarray) -> str:
    """Convert OpenCV image to base64 string."""
    _, buffer = cv2.imencode('.jpg', image)
    img_str = base64.b64encode(buffer).decode('utf-8')
    return f"data:image/jpeg;base64,{img_str}"


class ConnectionManager:
    """Manage WebSocket connections."""
    
    def __init__(self):
        self.active_connections: List[WebSocket] = []
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"Client connected. Total connections: {len(self.active_connections)}")
    
    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"Client disconnected. Total connections: {len(self.active_connections)}")
    
    async def send_personal_message(self, message: str, websocket: WebSocket):
        try:
            await websocket.send_text(message)
        except Exception as e:
            logger.error(f"Error sending message: {e}")


manager = ConnectionManager()


@app.get("/")
async def root():
    return {"message": "Object Tracking API", "version": "1.0.0", "status": "running"}


@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}


@app.post("/process-video")
async def process_video(file: UploadFile = File(...)):
    """Process an entire video file and return tracking analytics."""
    try:
        logger.info(f"Processing video: {file.filename}")
        
        # Read video file
        contents = await file.read()
        
        # Save temporarily
        temp_path = f"/tmp/{file.filename}"
        with open(temp_path, "wb") as f:
            f.write(contents)
        
        # Open video
        cap = cv2.VideoCapture(temp_path)
        
        if not cap.isOpened():
            return JSONResponse(
                status_code=400,
                content={"error": "Could not open video file"}
            )
        
        # Initialize simple tracker
        tracker = SimpleTracker()
        
        tracked_objects_history = []
        frame_count = 0
        max_frames = 300  # Limit to 30 seconds at 10fps to avoid timeout
        
        while True:
            ret, frame = cap.read()
            if not ret or frame_count >= max_frames:
                break
            
            frame_count += 1
            
            # Run YOLO detection (only process every 3rd frame for speed)
            if frame_count % 3 == 0:
                results = model(frame, verbose=False)[0]
                
                frame_objects = []
                for box in results.boxes:
                    x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                    conf = float(box.conf[0])
                    cls = int(box.cls[0])
                    
                    bbox = [int(x1), int(y1), int(x2), int(y2)]
                    class_name = CLASS_NAMES[cls] if cls < len(CLASS_NAMES) else "unknown"
                    track_id = tracker.get_id(bbox, class_name)
                    
                    frame_objects.append({
                        "id": int(track_id),
                        "bbox": bbox,
                        "class": class_name,
                        "confidence": conf,
                        "frame": frame_count
                    })
                
                if frame_objects:
                    tracked_objects_history.append({
                        "frame": frame_count,
                        "objects": frame_objects
                    })
        
        cap.release()
        
        # Clean up
        import os
        os.remove(temp_path)
        
        # Calculate analytics
        total_objects = len(set(
            obj["id"] 
            for frame_data in tracked_objects_history 
            for obj in frame_data["objects"]
        ))
        
        object_classes = {}
        for frame_data in tracked_objects_history:
            for obj in frame_data["objects"]:
                class_name = obj["class"]
                object_classes[class_name] = object_classes.get(class_name, 0) + 1
        
        return {
            "success": True,
            "filename": file.filename,
            "total_frames": frame_count,
            "total_unique_objects": total_objects,
            "object_classes": object_classes,
            "tracking_history": tracked_objects_history[:100],  # Limit for response size
            "message": "Video processed successfully"
        }
        
    except Exception as e:
        logger.error(f"Error processing video: {e}")
        import traceback
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
        )


@app.post("/process-frame")
async def process_frame(frame_data: Dict):
    """Process a single frame and return detections."""
    try:
        # Decode base64 image
        frame = base64_to_image(frame_data["image"])
        
        if frame is None:
            return JSONResponse(
                status_code=400,
                content={"error": "Invalid image data"}
            )
        
        # Run YOLO detection
        results = model(frame, verbose=False)[0]
        
        tracked_objects = []
        for i, box in enumerate(results.boxes):
            x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
            conf = float(box.conf[0])
            cls = int(box.cls[0])
            
            tracked_objects.append({
                "id": i + 1,  # Simple incremental ID
                "bbox": [int(x1), int(y1), int(x2), int(y2)],
                "class": CLASS_NAMES[cls] if cls < len(CLASS_NAMES) else "unknown",
                "confidence": conf
            })
        
        return {
            "objects": tracked_objects,
            "frame_id": frame_data.get("frame_id"),
            "timestamp": frame_data.get("timestamp"),
            "total_detections": len(tracked_objects)
        }
        
    except Exception as e:
        logger.error(f"Error processing frame: {e}")
        import traceback
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
        )


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time tracking."""
    await manager.connect(websocket)
    
    # Initialize simple tracker for this connection
    tracker = SimpleTracker()
    
    try:
        while True:
            # Receive message
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message.get("type") == "frame":
                try:
                    # Process frame
                    frame = base64_to_image(message["image"])
                    
                    if frame is None:
                        await manager.send_personal_message(
                            json.dumps({"error": "Invalid image data"}),
                            websocket
                        )
                        continue
                    
                    # Run YOLO detection
                    results = model(frame, verbose=False)[0]
                    
                    tracked_objects = []
                    for box in results.boxes:
                        x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                        conf = float(box.conf[0])
                        cls = int(box.cls[0])
                        
                        bbox = [int(x1), int(y1), int(x2), int(y2)]
                        class_name = CLASS_NAMES[cls] if cls < len(CLASS_NAMES) else "unknown"
                        track_id = tracker.get_id(bbox, class_name)
                        
                        tracked_objects.append({
                            "id": int(track_id),
                            "bbox": bbox,
                            "class": class_name,
                            "confidence": conf
                        })
                    
                    # Send response
                    response = {
                        "type": "tracking_update",
                        "objects": tracked_objects,
                        "frame_id": message.get("frame_id"),
                        "timestamp": datetime.now().isoformat(),
                        "total_detections": len(tracked_objects)
                    }
                    
                    await manager.send_personal_message(json.dumps(response), websocket)
                    
                except Exception as e:
                    logger.error(f"Error processing frame in WebSocket: {e}")
                    await manager.send_personal_message(
                        json.dumps({"error": str(e)}),
                        websocket
                    )
                    
            elif message.get("type") == "ping":
                await manager.send_personal_message(
                    json.dumps({"type": "pong"}),
                    websocket
                )
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        import traceback
        traceback.print_exc()
        manager.disconnect(websocket)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
