"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { TrackedObject, TrackingConfig } from "@/app/types/tracking";

interface UseObjectTrackerReturn {
  trackedObjects: TrackedObject[];
  isProcessing: boolean;
  isConnected: boolean;
  fps: number;
  error: string | null;
  startTracking: () => void;
  stopTracking: () => void;
  sendFrame: (frameData: string) => void;
}

export function useObjectTracker(
  config: TrackingConfig
): UseObjectTrackerReturn {
  const [trackedObjects, setTrackedObjects] = useState<TrackedObject[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [fps, setFps] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(Date.now());
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const connectWebSocket = useCallback(() => {
    try {
      setError(null);
      const ws = new WebSocket(config.wsUrl);

      ws.onopen = () => {
        console.log("Connected to tracking server");
        setIsConnected(true);
        setIsProcessing(true);

        // Start ping interval to keep connection alive
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "ping" }));
          }
        }, 30000);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === "pong") {
            return;
          }

          if (data.error) {
            console.error("Server error:", data.error);
            setError(data.error);
            return;
          }

          if (data.objects) {
            setTrackedObjects(data.objects);

            // Calculate FPS
            frameCountRef.current++;
            const now = Date.now();
            const delta = now - lastTimeRef.current;

            if (delta >= 1000) {
              setFps(Math.round((frameCountRef.current * 1000) / delta));
              frameCountRef.current = 0;
              lastTimeRef.current = now;
            }
          }
        } catch (err) {
          console.error("Error parsing message:", err);
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        setError("Connection error. Please check your network.");
        setIsConnected(false);
      };

      ws.onclose = () => {
        console.log("WebSocket connection closed");
        setIsConnected(false);
        setIsProcessing(false);

        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
        }
      };

      wsRef.current = ws;
    } catch (err) {
      console.error("Error creating WebSocket:", err);
      setError("Failed to connect to tracking server");
    }
  }, [config.wsUrl]);

  const sendFrame = useCallback(
    (frameData: string) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: "frame",
            image: frameData,
            timestamp: Date.now(),
            frame_id: frameCountRef.current,
          })
        );
      }
    },
    []
  );

  const startTracking = useCallback(() => {
    frameCountRef.current = 0;
    lastTimeRef.current = Date.now();
    connectWebSocket();
  }, [connectWebSocket]);

  const stopTracking = useCallback(() => {
    setIsProcessing(false);
    setTrackedObjects([]);
    setFps(0);

    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return {
    trackedObjects,
    isProcessing,
    isConnected,
    fps,
    error,
    startTracking,
    stopTracking,
    sendFrame,
  };
}
