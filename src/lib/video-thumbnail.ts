/**
 * Video Thumbnail Generation Utilities
 * 
 * Utilities for generating thumbnail images from video files.
 * Based on SkateHive's implementation for Zora video coins.
 */

/**
 * Generate a thumbnail image from a video file
 * 
 * @param videoFile - The video file to generate thumbnail from
 * @returns Promise<File> - A JPEG thumbnail file
 */
export const generateVideoThumbnail = async (videoFile: File): Promise<File> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    let videoUrl = '';
    
    if (!ctx) {
      reject(new Error('Canvas not supported in this browser'));
      return;
    }

    // Set a timeout to prevent hanging
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Video thumbnail generation timed out. The video format may not be supported for thumbnail extraction.'));
    }, 10000); // 10 second timeout

    const cleanup = () => {
      clearTimeout(timeout);
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
    };

    video.onloadedmetadata = () => {
      try {
        // Set canvas dimensions to video dimensions (with fallback)
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        
        // Seek to 1 second (or 10% of duration, whichever is smaller)
        const seekTime = Math.min(1, video.duration * 0.1);
        video.currentTime = seekTime;
      } catch (error) {
        cleanup();
        reject(new Error(`Failed to process video metadata: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    };

    video.onseeked = () => {
      try {
        // Draw the current frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert canvas to blob
        canvas.toBlob((blob) => {
          cleanup();
          if (blob) {
            const thumbnailFile = new File([blob], `${videoFile.name}_thumbnail.jpg`, {
              type: 'image/jpeg'
            });
            resolve(thumbnailFile);
          } else {
            reject(new Error('Failed to generate thumbnail image'));
          }
        }, 'image/jpeg', 0.8);
      } catch (error) {
        cleanup();
        reject(new Error(`Failed to draw video frame: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    };

    video.onerror = () => {
      cleanup();
      const error = video.error;
      let errorMessage = 'Video processing failed';
      
      if (error) {
        switch (error.code) {
          case MediaError.MEDIA_ERR_DECODE:
            errorMessage = 'Video codec not supported for thumbnail generation';
            break;
          case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
            errorMessage = 'Video format not supported for thumbnail generation';
            break;
          default:
            errorMessage = 'Video could not be processed for thumbnail';
        }
      }
      
      reject(new Error(errorMessage));
    };

    try {
      // Load the video
      videoUrl = URL.createObjectURL(videoFile);
      video.src = videoUrl;
      video.load();
    } catch (error) {
      cleanup();
      reject(new Error(`Failed to load video file: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  });
};

/**
 * Check if a file is a supported video format
 */
export const isSupportedVideo = (file: File): boolean => {
  const supportedTypes = [
    "video/mp4",
    "video/webm", 
    "video/quicktime",
    "video/x-m4v"
  ];
  return supportedTypes.includes(file.type);
};

/**
 * Check if a file is a supported image format
 */
export const isSupportedImage = (file: File): boolean => {
  const supportedTypes = [
    "image/jpeg",
    "image/jpg", 
    "image/png",
    "image/gif",
    "image/webp",
    "image/svg+xml",
  ];
  return supportedTypes.includes(file.type);
};