"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Camera, CameraOff, RefreshCw } from "lucide-react";

interface LiveStreamCaptureProps {
  onStreamStart: () => void;
  onStreamStop: () => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

export function LiveStreamCapture({
  onStreamStart,
  onStreamStop,
  videoRef,
}: LiveStreamCaptureProps) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startStream = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "environment",
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      setIsStreaming(true);
      onStreamStart();
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError(
        "Could not access camera. Please ensure you have granted camera permissions."
      );
    }
  }, [onStreamStart, videoRef]);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsStreaming(false);
    onStreamStop();
  }, [onStreamStop, videoRef]);

  const restartStream = useCallback(() => {
    stopStream();
    setTimeout(startStream, 100);
  }, [stopStream, startStream]);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full"
    >
      <AnimatePresence mode="wait">
        {!isStreaming ? (
          <motion.div
            key="start"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col items-center justify-center py-16 bg-muted/30 rounded-xl border-2 border-dashed border-muted"
          >
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                size="lg"
                onClick={startStream}
                className="h-auto py-6 px-8"
              >
                <Camera className="w-6 h-6 mr-3" />
                <div className="text-left">
                  <p className="text-lg font-semibold">Start Live Stream</p>
                  <p className="text-sm text-white/70">
                    Enable camera for real-time tracking
                  </p>
                </div>
              </Button>
            </motion.div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 p-4 bg-destructive/10 text-destructive rounded-lg max-w-md text-center"
              >
                {error}
              </motion.div>
            )}

            <div className="mt-8 text-center text-muted-foreground">
              <p className="text-sm">
                Make sure your camera is connected and accessible
              </p>
              <p className="text-xs mt-2">
                Your video is processed locally and not stored on any server
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="streaming"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative rounded-xl overflow-hidden bg-black"
          >
            <video
              ref={videoRef}
              className="w-full aspect-video object-contain"
              autoPlay
              playsInline
              muted
            />

            {/* Control overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-3"
            >
              <Button
                variant="secondary"
                size="sm"
                onClick={restartStream}
                className="shadow-lg bg-black/50 hover:bg-black/70 text-white backdrop-blur-sm"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Restart
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={stopStream}
                className="shadow-lg"
              >
                <CameraOff className="w-4 h-4 mr-2" />
                Stop Stream
              </Button>
            </motion.div>

            {/* Recording indicator */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute top-4 left-4 flex items-center gap-2 bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-full"
            >
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="w-2.5 h-2.5 bg-red-500 rounded-full"
              />
              <span className="text-white text-sm font-medium">LIVE</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
