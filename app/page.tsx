"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { VideoUploader } from "@/app/components/video-uploader";
import { TrackingCanvas } from "@/app/components/tracking-canvas";
import { AnalyticsDashboard } from "@/app/components/analytics-dashboard";
import { LiveStreamCapture } from "@/app/components/live-stream-capture";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useObjectTracker } from "@/app/hooks/use-object-tracker";
import { Play, Pause, Download, Video, Camera, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { VideoProcessingResponse, AnalyticsData } from "@/app/types/tracking";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"upload" | "live">("upload");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processingResult, setProcessingResult] = useState<VideoProcessingResponse | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalObjects: 0,
    avgConfidence: 0,
    confidenceHistory: [],
    objectClasses: [],
  });
  const [error, setError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws";

  const {
    trackedObjects,
    isProcessing: isTracking,
    isConnected,
    fps,
    error: trackingError,
    startTracking,
    stopTracking,
    sendFrame,
  } = useObjectTracker({
    wsUrl,
    apiUrl: backendUrl,
  });

  // Convert video frame to base64 and send
  const captureAndSendFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Check if video is playing
    if (video.paused || video.ended) return;

    // Match canvas to video dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to base64
    const frameData = canvas.toDataURL("image/jpeg", 0.8);
    sendFrame(frameData);
  }, [sendFrame]);

  // Start frame capture when tracking begins
  useEffect(() => {
    if (isTracking && activeTab === "live") {
      // Capture frame every 100ms (10 FPS)
      frameIntervalRef.current = setInterval(captureAndSendFrame, 100);
    }

    return () => {
      if (frameIntervalRef.current) {
        clearInterval(frameIntervalRef.current);
      }
    };
  }, [isTracking, activeTab, captureAndSendFrame]);

  const handleVideoSelect = useCallback(async (file: File) => {
    setError(null);
    setIsProcessing(true);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/process-video", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to process video");
      }

      const data: VideoProcessingResponse = await response.json();
      setProcessingResult(data);
      
      // Update analytics
      setAnalytics({
        totalObjects: data.total_unique_objects,
        avgConfidence: 0.85, // Placeholder
        confidenceHistory: [],
        objectClasses: Object.entries(data.object_classes).map(([class_name, count]) => ({
          class: class_name,
          count: count as number,
        })),
      });

      // Simulate progress
      let currentProgress = 0;
      const interval = setInterval(() => {
        currentProgress += 10;
        setProgress(Math.min(currentProgress, 100));
        if (currentProgress >= 100) {
          clearInterval(interval);
        }
      }, 200);

    } catch (err) {
      console.error("Error processing video:", err);
      setError("Failed to process video. Please try again.");
    } finally {
      setTimeout(() => {
        setIsProcessing(false);
      }, 2500);
    }
  }, []);

  const handleExport = useCallback(() => {
    if (!processingResult) return;

    const dataStr = JSON.stringify(processingResult, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `tracking-results-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [processingResult]);

  // Update analytics based on live tracking
  useEffect(() => {
    if (activeTab === "live" && trackedObjects.length > 0) {
      const uniqueIds = new Set(trackedObjects.map((obj) => obj.id));
      const avgConf =
        trackedObjects.reduce((acc, obj) => acc + obj.confidence, 0) /
        trackedObjects.length;

      setAnalytics((prev) => ({
        ...prev,
        totalObjects: uniqueIds.size,
        avgConfidence: avgConf,
        confidenceHistory: [
          ...prev.confidenceHistory.slice(-50),
          {
            timestamp: new Date().toISOString(),
            confidence: avgConf,
          },
        ],
      }));
    }
  }, [trackedObjects, activeTab]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
      >
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center"
        >
          <motion.h1
            className="text-4xl md:text-5xl font-bold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-primary via-primary/80 to-primary/60"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
          >
            Object Tracking Dashboard
          </motion.h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Real-time multi-object detection and tracking powered by YOLOv8 and DeepSORT
          </p>
        </motion.div>

        {/* Error Alert */}
        <AnimatePresence>
          {(error || trackingError) && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6"
            >
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error || trackingError}</AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Video Input */}
          <div className="lg:col-span-2 space-y-6">
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as "upload" | "live")}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="upload" className="flex items-center gap-2">
                  <Video className="w-4 h-4" />
                  Upload Video
                </TabsTrigger>
                <TabsTrigger value="live" className="flex items-center gap-2">
                  <Camera className="w-4 h-4" />
                  Live Stream
                </TabsTrigger>
              </TabsList>

              <TabsContent value="upload" className="mt-0">
                <VideoUploader
                  onVideoSelect={handleVideoSelect}
                  isProcessing={isProcessing}
                  progress={progress}
                />

                {/* Processing Results */}
                <AnimatePresence>
                  {processingResult && !isProcessing && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 20 }}
                      className="mt-6 p-6 bg-card rounded-xl border shadow-sm"
                    >
                      <h3 className="text-lg font-semibold mb-4">
                        Processing Complete
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-4 bg-muted rounded-lg">
                          <p className="text-sm text-muted-foreground">Frames</p>
                          <p className="text-2xl font-bold">
                            {processingResult.total_frames}
                          </p>
                        </div>
                        <div className="p-4 bg-muted rounded-lg">
                          <p className="text-sm text-muted-foreground">
                            Unique Objects
                          </p>
                          <p className="text-2xl font-bold">
                            {processingResult.total_unique_objects}
                          </p>
                        </div>
                        <div className="p-4 bg-muted rounded-lg">
                          <p className="text-sm text-muted-foreground">
                            Object Types
                          </p>
                          <p className="text-2xl font-bold">
                            {Object.keys(processingResult.object_classes).length}
                          </p>
                        </div>
                        <div className="p-4 bg-muted rounded-lg">
                          <p className="text-sm text-muted-foreground">Status</p>
                          <p className="text-2xl font-bold text-green-600">Done</p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </TabsContent>

              <TabsContent value="live" className="mt-0">
                {/* Hidden canvas for frame capture */}
                <canvas ref={canvasRef} className="hidden" />

                <LiveStreamCapture
                  onStreamStart={startTracking}
                  onStreamStop={stopTracking}
                  videoRef={videoRef}
                />

                {/* Live Feed with Tracking Overlay */}
                <AnimatePresence>
                  {activeTab === "live" && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="relative mt-4 bg-black rounded-xl overflow-hidden"
                    >
                      <div className="relative aspect-video">
                        <video
                          ref={videoRef}
                          className="absolute inset-0 w-full h-full object-contain"
                          autoPlay
                          playsInline
                          muted
                        />
                        <TrackingCanvas
                          videoRef={videoRef}
                          trackedObjects={trackedObjects}
                          isLive={isTracking}
                        />
                      </div>

                      {/* Status Overlay */}
                      <div className="absolute top-4 right-4 flex flex-col gap-2">
                        {isConnected && (
                          <div className="bg-green-500/20 backdrop-blur-sm text-green-400 px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            Connected
                          </div>
                        )}
                        {isTracking && (
                          <div className="bg-black/50 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-sm font-mono">
                            FPS: {fps}
                          </div>
                        )}
                      </div>

                      {/* Object Counter */}
                      <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-sm text-white px-4 py-2 rounded-full">
                        <span className="text-sm">
                          Objects: <span className="font-bold">{trackedObjects.length}</span>
                        </span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Column - Analytics */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="h-full"
            >
              <AnalyticsDashboard
                analytics={analytics}
                trackedObjects={trackedObjects}
                fps={fps}
              />
            </motion.div>
          </div>
        </div>

        {/* Control Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50"
        >
          <div className="flex gap-3 bg-background/80 backdrop-blur-lg border rounded-full px-4 py-3 shadow-xl">
            {activeTab === "live" && (
              <>
                {!isTracking ? (
                  <Button
                    size="lg"
                    onClick={startTracking}
                    className="rounded-full"
                  >
                    <Play className="w-5 h-5 mr-2" />
                    Start Tracking
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    variant="destructive"
                    onClick={stopTracking}
                    className="rounded-full"
                  >
                    <Pause className="w-5 h-5 mr-2" />
                    Stop Tracking
                  </Button>
                )}
              </>
            )}

            {(processingResult || trackedObjects.length > 0) && (
              <Button
                size="lg"
                variant="outline"
                onClick={handleExport}
                className="rounded-full"
              >
                <Download className="w-5 h-5 mr-2" />
                Export Data
              </Button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </main>
  );
}
