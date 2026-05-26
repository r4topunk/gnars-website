"use client";

import { useId, useRef, useState, type ChangeEvent } from "react";
import Image from "next/image";
import { ImageIcon, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const MAX_IMAGE_UPLOAD_BYTES = 8 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 1600;

export function RoundImageField({
  label,
  value,
  onChange,
  placeholder = "https://example.com/image.jpg",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const inputId = useId();
  const uploadId = useId();
  const uploadRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const isDataImage = value.startsWith("data:image/");

  const uploadImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    setError("");

    if (!file) return;

    try {
      const image = await readOptimizedImage(file);
      onChange(image);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Image upload failed.");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label htmlFor={inputId} className="text-sm font-medium">
          {label}
        </label>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => uploadRef.current?.click()}
          >
            <Upload className="size-4" />
            Upload image
          </Button>
          {value && (
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange("")}>
              <X className="size-4" />
              Clear
            </Button>
          )}
        </div>
      </div>

      <Input
        id={inputId}
        value={isDataImage ? "Uploaded image selected" : value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        readOnly={isDataImage}
      />
      <input
        id={uploadId}
        ref={uploadRef}
        className="sr-only"
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={uploadImage}
      />

      {value && (
        <div className="relative h-48 overflow-hidden rounded-md border border-border bg-muted/30">
          <Image src={value} alt="" fill sizes="100vw" className="object-cover" unoptimized />
        </div>
      )}

      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <ImageIcon className="size-3.5" />
          Paste an image URL or upload PNG, JPG, WebP, or GIF.
        </p>
      )}
    </div>
  );
}

async function readOptimizedImage(file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error("Choose an image file.");
  }

  if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
    throw new Error("Image uploads must be under 8 MB.");
  }

  if (file.type === "image/gif") {
    return readFileAsDataUrl(file);
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await loadImage(objectUrl);
    const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");

    if (!context) throw new Error("Image processing is not available in this browser.");

    context.drawImage(image, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", 0.86);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = document.createElement("img");
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not read image."));
    image.src = src;
  });
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read image."));
    reader.readAsDataURL(file);
  });
}
