"use client";

import * as React from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const NOGGLES_ASCII = "⌐◨-◨";

function fallbackCopyTextToClipboard(text: string): boolean {
  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "-9999px";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

export function NogglesCopyFooter({ className }: { className?: string }) {
  const onCopy = React.useCallback(async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(NOGGLES_ASCII);
      } else {
        const ok = fallbackCopyTextToClipboard(NOGGLES_ASCII);
        if (!ok) throw new Error("copy failed");
      }

      toast.success("Copied");
    } catch {
      toast.error("Failed to copy");
    }
  }, []);

  return (
    <footer className={cn("mt-10 pb-14", className)}>
      <div className="flex items-center justify-center">
        <p className="font-sans text-sm text-muted-foreground">
          made with{" "}
          <a
            href="#"
            onClick={(event) => {
              event.preventDefault();
              void onCopy();
            }}
            className="hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            aria-label='Copy "⌐◨-◨"'
            title='Copy "⌐◨-◨"'
          >
            {NOGGLES_ASCII}
          </a>
        </p>
      </div>
    </footer>
  );
}
