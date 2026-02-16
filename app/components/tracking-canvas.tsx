"use client";

import { useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { TrackedObject } from "@/app/types/tracking";

interface TrackingCanvasProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  trackedObjects: TrackedObject[];
  isLive: boolean;
}

const COLORS = [
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#96CEB4",
  "#FECA57",
  "#FF9FF3",
  "#54A0FF",
  "#48DBFB",
  "#1DD1A1",
  "#FFC048",
  "#FF6B9D",
  "#C44569",
  "#F8B500",
  "#6C5CE7",
  "#A29BFE",
];

export function TrackingCanvas({
  videoRef,
  trackedObjects,
  isLive,
}: TrackingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;

    if (!canvas || !video) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Match canvas to video dimensions
    if (
      canvas.width !== video.videoWidth ||
      canvas.height !== video.videoHeight
    ) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate scale factors
    const scaleX = canvas.width / (video.videoWidth || 1);
    const scaleY = canvas.height / (video.videoHeight || 1);

    // Draw tracking boxes
    trackedObjects.forEach((obj) => {
      const color = COLORS[obj.id % COLORS.length];
      const [x1, y1, x2, y2] = obj.bbox;

      // Scale coordinates
      const sx1 = x1 * scaleX;
      const sy1 = y1 * scaleY;
      const sx2 = x2 * scaleX;
      const sy2 = y2 * scaleY;
      const width = sx2 - sx1;
      const height = sy2 - sy1;

      // Draw bounding box
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.strokeRect(sx1, sy1, width, height);

      // Draw corner accents
      const cornerLength = Math.min(width, height) * 0.2;
      ctx.lineWidth = 4;

      // Top-left corner
      ctx.beginPath();
      ctx.moveTo(sx1, sy1 + cornerLength);
      ctx.lineTo(sx1, sy1);
      ctx.lineTo(sx1 + cornerLength, sy1);
      ctx.stroke();

      // Top-right corner
      ctx.beginPath();
      ctx.moveTo(sx2 - cornerLength, sy1);
      ctx.lineTo(sx2, sy1);
      ctx.lineTo(sx2, sy1 + cornerLength);
      ctx.stroke();

      // Bottom-left corner
      ctx.beginPath();
      ctx.moveTo(sx1, sy2 - cornerLength);
      ctx.lineTo(sx1, sy2);
      ctx.lineTo(sx1 + cornerLength, sy2);
      ctx.stroke();

      // Bottom-right corner
      ctx.beginPath();
      ctx.moveTo(sx2 - cornerLength, sy2);
      ctx.lineTo(sx2, sy2);
      ctx.lineTo(sx2, sy2 - cornerLength);
      ctx.stroke();

      // Draw label background
      const label = `ID:${obj.id} ${obj.class}`;
      const confidence = `${(obj.confidence * 100).toFixed(0)}%`;
      const fullLabel = `${label} ${confidence}`;

      ctx.font = "bold 14px Inter, sans-serif";
      const textMetrics = ctx.measureText(fullLabel);
      const textHeight = 24;
      const padding = 8;

      // Label background
      ctx.fillStyle = color;
      ctx.fillRect(
        sx1,
        sy1 - textHeight - 4,
        textMetrics.width + padding * 2,
        textHeight
      );

      // Label text
      ctx.fillStyle = "#FFFFFF";
      ctx.fillText(fullLabel, sx1 + padding, sy1 - 8);

      // Draw trajectory (if available)
      if (obj.trajectory && obj.trajectory.length > 1) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.moveTo(
          obj.trajectory[0].x * scaleX,
          obj.trajectory[0].y * scaleY
        );

        for (let i = 1; i < obj.trajectory.length; i++) {
          ctx.lineTo(
            obj.trajectory[i].x * scaleX,
            obj.trajectory[i].y * scaleY
          );
        }

        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.setLineDash([]);
      }
    });

    animationRef.current = requestAnimationFrame(draw);
  }, [trackedObjects, videoRef]);

  useEffect(() => {
    if (isLive) {
      draw();
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [draw, isLive]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute inset-0 pointer-events-none"
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ objectFit: "contain" }}
      />
    </motion.div>
  );
}
