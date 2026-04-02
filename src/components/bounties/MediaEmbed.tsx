'use client';

import { useQuery } from '@tanstack/react-query';
import { ExternalLink } from 'lucide-react';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';

interface MediaInfo {
  contentType: string;
  isVideo: boolean;
  isImage: boolean;
  isAttachment: boolean;
  error?: string;
}

interface MediaEmbedProps {
  url: string;
  alt?: string;
  className?: string;
}

export function MediaEmbed({ url, alt = '', className = '' }: MediaEmbedProps) {
  const { data, isLoading } = useQuery<MediaInfo>({
    queryKey: ['media-type', url],
    queryFn: async () => {
      const res = await fetch(`/api/media-type?url=${encodeURIComponent(url)}`);
      return res.json();
    },
    staleTime: 60 * 60 * 1000, // 1 hour — content type doesn't change
  });

  if (isLoading) {
    return <Skeleton className={`h-20 w-full ${className}`} />;
  }

  // Attachment or unknown — safe link, never auto-download
  if (!data || data.isAttachment || data.error || (!data.isVideo && !data.isImage)) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-border text-sm text-primary hover:bg-muted transition-colors"
      >
        <ExternalLink className="w-4 h-4" />
        View media
      </a>
    );
  }

  if (data.isVideo) {
    return (
      <video
        src={url}
        className={`rounded-md max-w-full h-auto max-h-64 ${className}`}
        controls
        playsInline
      >
        <track kind="captions" />
      </video>
    );
  }

  // Image
  return (
    <Dialog>
      <DialogTrigger asChild>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={alt}
          className={`rounded-md max-w-full h-auto max-h-64 object-cover cursor-pointer hover:opacity-90 transition-opacity ${className}`}
          loading="lazy"
        />
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 border-0 bg-transparent">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={alt}
          className="w-full h-auto max-h-[95vh] object-contain"
        />
      </DialogContent>
    </Dialog>
  );
}
