export interface BoundingBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface TrackedObject {
  id: number;
  bbox: [number, number, number, number];
  class: string;
  confidence: number;
  trajectory?: { x: number; y: number }[];
}

export interface TrackingConfig {
  wsUrl: string;
  apiUrl: string;
  confidenceThreshold?: number;
}

export interface AnalyticsData {
  totalObjects: number;
  avgConfidence: number;
  confidenceHistory: Array<{
    timestamp: string;
    confidence: number;
  }>;
  objectClasses: Array<{
    class: string;
    count: number;
  }>;
  trajectoryData?: Array<{
    objectId: number;
    points: Array<{ x: number; y: number; timestamp: number }>;
  }>;
}

export interface FrameData {
  image: string;
  frame_id: number;
  timestamp: number;
}

export interface TrackingResponse {
  objects: TrackedObject[];
  frame_id?: number;
  timestamp?: string;
  total_detections: number;
}

export interface VideoProcessingResponse {
  success: boolean;
  filename: string;
  total_frames: number;
  total_unique_objects: number;
  object_classes: Record<string, number>;
  tracking_history: Array<{
    frame: number;
    objects: TrackedObject[];
  }>;
  message: string;
}
