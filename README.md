# Object Tracking Dashboard

A real-time multi-object detection and tracking dashboard powered by YOLOv8 and DeepSORT. Built with Next.js, FastAPI, and modern UI components.

## Features

- **Real-time Object Detection**: Process video streams live using your webcam
- **Multi-Object Tracking**: Track objects across frames with DeepSORT algorithm
- **Video Upload Processing**: Upload and analyze pre-recorded videos
- **Interactive Analytics**: View object distribution, confidence scores, and performance metrics
- **Beautiful UI**: Modern interface with Framer Motion animations and Tailwind CSS
- **WebSocket Support**: Real-time communication between frontend and backend

## Tech Stack

### Frontend
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui components
- Framer Motion
- Recharts
- react-dropzone

### Backend
- FastAPI
- Python 3.9+
- YOLOv8 (Ultralytics)
- DeepSORT
- OpenCV
- WebSockets

### Deployment
- Frontend: Vercel
- Backend: Railway/Render
- Docker support included

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.9+
- npm or yarn
- pip

### 1. Setup Frontend

```bash
cd my-app
npm install
```

### 2. Setup Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws
```

### 3. Start Frontend Development Server

```bash
npm run dev
```

Frontend will be available at `http://localhost:3000`

### 4. Setup Python Backend

```bash
cd python-backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 5. Start Backend Server

```bash
python app.py
```

Backend will be available at `http://localhost:8000`

### 6. Access the Application

Open your browser and navigate to `http://localhost:3000`

## Deployment

### Deploy Frontend to Vercel

1. Push your code to GitHub
2. Connect repository to Vercel
3. Set environment variables:
   - `NEXT_PUBLIC_BACKEND_URL`: Your backend URL
   - `NEXT_PUBLIC_WS_URL`: Your WebSocket URL (wss://)
4. Deploy

### Deploy Backend to Railway

1. Push your code to GitHub
2. Connect repository to Railway
3. Railway will automatically detect the Dockerfile
4. Add environment variables if needed
5. Deploy

## Usage

### Live Stream Mode
1. Click "Live Stream" tab
2. Click "Start Live Stream" and allow camera access
3. Click "Start Tracking" to begin real-time object detection
4. View detected objects and analytics in real-time
5. Click "Stop Tracking" when done

### Upload Video Mode
1. Click "Upload Video" tab
2. Drag and drop or click to select a video file
3. Wait for processing to complete
4. View detailed analytics and tracking results
5. Export data as JSON if needed

## API Endpoints

### REST Endpoints
- `GET /` - Health check
- `GET /health` - Server health status
- `POST /process-video` - Upload and process video file
- `POST /process-frame` - Process single frame (base64 image)

### WebSocket
- `WS /ws` - Real-time frame processing
  - Send: `{"type": "frame", "image": "base64...", "frame_id": 1}`
  - Receive: `{"type": "tracking_update", "objects": [...], "total_detections": N}`

## Supported Object Classes

The model uses COCO dataset with 80 classes including:
- person, car, bicycle, motorcycle
- bird, cat, dog, horse
- backpack, umbrella, handbag
- bottle, wine glass, cup
- chair, couch, bed, dining table
- TV, laptop, mouse, keyboard
- And many more...

## Project Structure

```
object-tracking-dashboard/
├── my-app/                 # Next.js frontend
│   ├── app/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── types/
│   │   └── api/
│   ├── components/ui/      # shadcn components
│   └── python-backend/     # FastAPI backend
│       ├── app.py
│       ├── requirements.txt
│       └── Dockerfile
```

## License

MIT License

Built with ❤️ using Next.js, FastAPI, and YOLOv8
