const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "webp", "svg", "avif"] as const;
const VIDEO_EXTENSIONS = ["mp4", "webm", "mov", "m4v", "ogv"] as const;
const AUDIO_EXTENSIONS = ["mp3", "wav", "ogg", "m4a", "flac"] as const;

export type MediaKind = "image" | "video" | "audio";

export function classifyMediaUrl(url: string | undefined | null): MediaKind | null {
  if (!url) return null;
  let pathname: string;
  try {
    pathname = new URL(url, "https://placeholder.local").pathname;
  } catch {
    return null;
  }
  const lower = pathname.toLowerCase();
  const ext = lower.split(".").pop();
  if (!ext) return null;
  if ((IMAGE_EXTENSIONS as readonly string[]).includes(ext)) return "image";
  if ((VIDEO_EXTENSIONS as readonly string[]).includes(ext)) return "video";
  if ((AUDIO_EXTENSIONS as readonly string[]).includes(ext)) return "audio";
  return null;
}

export interface MediaMatch {
  url: string;
  kind: MediaKind;
}

const IMAGE_MARKDOWN = /!\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/;
const LINK_MARKDOWN = /\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/g;
const BARE_URL = /(https?:\/\/[^\s)]+)/g;

export function extractFirstMedia(markdown: string | undefined | null): MediaMatch | null {
  if (!markdown) return null;

  const img = markdown.match(IMAGE_MARKDOWN);
  if (img?.[1]) {
    const kind = classifyMediaUrl(img[1]) ?? "image";
    return { url: img[1], kind };
  }

  for (const match of markdown.matchAll(LINK_MARKDOWN)) {
    const kind = classifyMediaUrl(match[1]);
    if (kind) return { url: match[1], kind };
  }

  for (const match of markdown.matchAll(BARE_URL)) {
    const kind = classifyMediaUrl(match[1]);
    if (kind) return { url: match[1], kind };
  }

  return null;
}

export function stripMarkdown(markdown: string, maxLength = 180): string {
  const withoutImages = markdown.replace(/!\[[^\]]*\]\([^)]+\)/g, "");
  const withoutLinks = withoutImages.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  const withoutMarks = withoutLinks
    .replace(/[#>*_`~]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (withoutMarks.length <= maxLength) return withoutMarks;
  return `${withoutMarks.slice(0, maxLength).trimEnd()}…`;
}
