"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDropzone } from "react-dropzone";
import { Upload, Video, X, FileVideo } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface VideoUploaderProps {
  onVideoSelect: (file: File) => void;
  isProcessing: boolean;
  progress: number;
}

export function VideoUploader({
  onVideoSelect,
  isProcessing,
  progress,
}: VideoUploaderProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const onDrop = (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setSelectedFile(file);
      setPreview(URL.createObjectURL(file));
      onVideoSelect(file);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "video/*": [".mp4", ".avi", ".mov", ".mkv", ".webm"],
    },
    maxFiles: 1,
    disabled: isProcessing,
  });

  const clearSelection = () => {
    if (preview) {
      URL.revokeObjectURL(preview);
    }
    setPreview(null);
    setSelectedFile(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full"
    >
      <AnimatePresence mode="wait">
        {!preview ? (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <div
              {...getRootProps()}
              className={cn(
                "border-2 border-dashed rounded-xl p-12 text-center cursor-pointer",
                "transition-all duration-300 ease-in-out",
                isDragActive
                  ? "border-primary bg-primary/5 scale-[1.02]"
                  : "border-gray-300 hover:border-gray-400 hover:bg-gray-50/50"
              )}
            >
              <input {...getInputProps()} />
              <motion.div
                whileHover={{ scale: isDragActive ? 1 : 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex flex-col items-center"
              >
                <div
                  className={cn(
                    "mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-6 transition-colors",
                    isDragActive
                      ? "bg-primary/20"
                      : "bg-primary/10"
                  )}
                >
                  <Upload
                    className={cn(
                      "w-10 h-10 transition-colors",
                      isDragActive ? "text-primary" : "text-primary/70"
                    )}
                  />
                </div>
                <p className="text-xl font-semibold mb-2">
                  {isDragActive
                    ? "Drop your video here"
                    : "Drag & drop your video"}
                </p>
                <p className="text-sm text-muted-foreground">
                  or click to browse (MP4, AVI, MOV, MKV, WebM)
                </p>
                <p className="text-xs text-muted-foreground mt-4">
                  Maximum file size: 100MB
                </p>
              </motion.div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="relative rounded-xl overflow-hidden bg-black"
          >
            <video
              src={preview}
              className="w-full max-h-[500px] object-contain"
              controls
              controlsList="nodownload"
            />

            {!isProcessing && (
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-4 right-4 shadow-lg"
                onClick={clearSelection}
              >
                <X className="w-5 h-5" />
              </Button>
            )}

            {isProcessing && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent"
              >
                <div className="space-y-3">
                  <div className="flex justify-between text-white text-sm">
                    <span className="font-medium">Processing video...</span>
                    <span className="font-mono">{progress}%</span>
                  </div>
                  <Progress value={progress} className="w-full h-2" />
                  <p className="text-white/70 text-xs">
                    Analyzing frames and tracking objects
                  </p>
                </div>
              </motion.div>
            )}

            {selectedFile && !isProcessing && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute bottom-4 left-4 right-4"
              >
                <div className="bg-black/60 backdrop-blur-sm rounded-lg p-3 flex items-center gap-3">
                  <FileVideo className="w-5 h-5 text-white" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">
                      {selectedFile.name}
                    </p>
                    <p className="text-white/60 text-xs">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
