"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

interface VideoPlayerProps {
  file: File;
  className?: string;
  onError?: (error: string) => void;
  onLoadedData?: () => void;
  onLoadedMetadata?: () => void;
  onTimeUpdate?: (currentTime: number) => void;
  onDurationChange?: (duration: number) => void;
}

export interface VideoPlayerRef {
  currentTime: number;
  duration: number;
  play: () => void;
  pause: () => void;
  seekTo: (time: number) => void;
  waitForSeek: () => Promise<void>;
  captureFrame: () => Promise<File>;
}

export const VideoPlayer = forwardRef<VideoPlayerRef, VideoPlayerProps>(
  (
    { file, className, onError, onLoadedData, onLoadedMetadata, onTimeUpdate, onDurationChange },
    ref,
  ) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [videoUrl, setVideoUrl] = useState<string>("");
    const [isLoaded, setIsLoaded] = useState(false);

    // Create video URL when file changes
    useEffect(() => {
      let url = "";
      try {
        url = URL.createObjectURL(file);
        setVideoUrl(url);
      } catch {
        onError?.("Failed to load video file");
      }

      return () => {
        if (url) {
          URL.revokeObjectURL(url);
        }
      };
    }, [file, onError]);

    // Set up video element when URL is ready
    useEffect(() => {
      const video = videoRef.current;
      if (!video || !videoUrl) return;

      const handleLoadedMetadata = () => {
        setIsLoaded(true);
        onLoadedMetadata?.();
        onDurationChange?.(video.duration);
      };

      const handleLoadedData = () => {
        onLoadedData?.();
      };

      const handleTimeUpdate = () => {
        onTimeUpdate?.(video.currentTime);
      };

      const handleError = () => {
        const errorMessage = video.error
          ? `Video error: ${video.error.message || "Cannot play this video format"}`
          : "Video failed to load";
        onError?.(errorMessage);
      };

      // Add event listeners
      video.addEventListener("loadedmetadata", handleLoadedMetadata);
      video.addEventListener("loadeddata", handleLoadedData);
      video.addEventListener("timeupdate", handleTimeUpdate);
      video.addEventListener("error", handleError);

      // Set the source
      video.src = videoUrl;
      video.load();

      return () => {
        video.removeEventListener("loadedmetadata", handleLoadedMetadata);
        video.removeEventListener("loadeddata", handleLoadedData);
        video.removeEventListener("timeupdate", handleTimeUpdate);
        video.removeEventListener("error", handleError);
      };
    }, [videoUrl, file, onError, onLoadedData, onLoadedMetadata, onTimeUpdate, onDurationChange]);

    // Expose methods via ref
    useImperativeHandle(
      ref,
      () => ({
        get currentTime() {
          return videoRef.current?.currentTime || 0;
        },
        get duration() {
          return videoRef.current?.duration || 0;
        },
        play: () => {
          videoRef.current?.play();
        },
        pause: () => {
          videoRef.current?.pause();
        },
        seekTo: (time: number) => {
          if (videoRef.current) {
            videoRef.current.currentTime = time;
          }
        },
        waitForSeek: (): Promise<void> => {
          return new Promise((resolve) => {
            const video = videoRef.current;
            if (!video) {
              resolve();
              return;
            }

            const onSeeked = () => {
              video.removeEventListener("seeked", onSeeked);
              resolve();
            };

            video.addEventListener("seeked", onSeeked);
          });
        },
        captureFrame: async (): Promise<File> => {
          const video = videoRef.current;
          if (!video || !isLoaded) {
            throw new Error("Video not loaded");
          }

          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");

          if (!ctx) {
            throw new Error("Canvas not supported");
          }

          // Set canvas size to video size
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 480;

          // Draw current frame
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          // Convert to blob
          return new Promise((resolve, reject) => {
            canvas.toBlob(
              (blob) => {
                if (blob) {
                  const thumbnailFile = new File([blob], `${file.name}_thumbnail.jpg`, {
                    type: "image/jpeg",
                  });
                  resolve(thumbnailFile);
                } else {
                  reject(new Error("Failed to capture frame"));
                }
              },
              "image/jpeg",
              0.8,
            );
          });
        },
      }),
      [isLoaded, file],
    );

    return <video ref={videoRef} className={className} preload="metadata" playsInline />;
  },
);

VideoPlayer.displayName = "VideoPlayer";
