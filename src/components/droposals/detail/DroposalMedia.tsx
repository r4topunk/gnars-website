/**
 * DroposalMedia
 * Displays either a video (animationURI) or an image (imageURI) with 16:9 aspect ratio.
 *
 * Props:
 * - mediaImage?: http(s) URL for image
 * - mediaAnimation?: http(s) URL for video
 * - alt: alt text for media
 */
import Image from "next/image";

export interface DroposalMediaProps {
  mediaImage?: string;
  mediaAnimation?: string;
  alt: string;
}

export function DroposalMedia({ mediaImage, mediaAnimation, alt }: DroposalMediaProps) {
  return (
    <div className="relative w-full aspect-[16/9] bg-muted rounded-xl overflow-hidden">
      {mediaAnimation ? (
        <video
          src={mediaAnimation}
          className="h-full w-full object-cover"
          controls
          preload="metadata"
        />
      ) : mediaImage ? (
        <Image src={mediaImage} alt={alt} fill className="object-cover" />
      ) : (
        <div className="h-full w-full" />
      )}
    </div>
  );
}
