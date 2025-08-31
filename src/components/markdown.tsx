"use client";

import * as React from "react";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeExternalLinks from "rehype-external-links";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import { cn } from "@/lib/utils";

interface MarkdownProps {
  children: string;
  className?: string;
}

export function Markdown({ children, className }: MarkdownProps) {
  return (
    <div
      className={cn(
        "prose prose-neutral dark:prose-invert max-w-none",
        // Headings and anchors
        "prose-h1:scroll-mt-24 prose-h2:scroll-mt-24 prose-h3:scroll-mt-24",
        "prose-a:break-words",
        // Code blocks
        "prose-pre:bg-muted prose-pre:p-0 prose-pre:rounded-lg",
        "prose-code:before:hidden prose-code:after:hidden",
        // Images & tables
        "prose-img:rounded-md prose-img:border",
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        rehypePlugins={[
          rehypeSlug,
          [
            rehypeAutolinkHeadings,
            {
              behavior: "append",
              properties: {
                className: [
                  "no-underline",
                  "ml-1",
                  "text-muted-foreground",
                  "hover:text-foreground",
                ],
                ariaHidden: "true",
              },
            },
          ],
          [
            rehypeExternalLinks,
            { target: "_blank", rel: ["noopener", "noreferrer"] },
          ],
          [
            rehypeSanitize,
            {
              ...defaultSchema,
              attributes: {
                ...defaultSchema.attributes,
                a: [
                  ...(defaultSchema.attributes?.a || []),
                  ["a", "target"],
                  ["a", "rel"],
                ],
                code: [
                  ...(defaultSchema.attributes?.code || []),
                  ["code", "className"],
                ],
              },
            },
          ],
        ]}
        components={((): Components => ({
          a({ className, ...props }) {
            return (
              <a
                className={cn(
                  "underline decoration-muted-foreground hover:text-foreground",
                  className,
                )}
                {...props}
              />
            );
          },
          img({ src, alt, ...props }) {
            const url = typeof src === "string" ? src : undefined;
            const imageEl = (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                loading="lazy"
                className="rounded-md border mx-auto my-2 max-h-[460px] w-auto max-w-full"
                src={url}
                alt={typeof alt === "string" ? alt : ""}
                {...props}
              />
            );
            return url ? (
              <a href={url} target="_blank" rel="noopener noreferrer">
                {imageEl}
              </a>
            ) : (
              imageEl
            );
          },
          table({ className, ...props }) {
            return (
              <div className="not-prose w-full overflow-x-auto">
                <table className={cn("w-full text-sm", className)} {...props} />
              </div>
            );
          },
          th({ className, ...props }) {
            return (
              <th
                className={cn(
                  "bg-muted/50 text-left font-medium px-3 py-2 border-b",
                  className,
                )}
                {...props}
              />
            );
          },
          td({ className, ...props }) {
            return (
              <td
                className={cn("px-3 py-2 align-top border-b", className)}
                {...props}
              />
            );
          },
          pre({ className, ...props }) {
            return (
              <pre
                className={cn(
                  "rounded-lg border bg-background p-4 overflow-x-auto",
                  className,
                )}
                {...props}
              />
            );
          },
          code(props) {
            const { className, children, ...rest } =
              (props as unknown as React.HTMLAttributes<HTMLElement> & {
                className?: string;
                children?: React.ReactNode;
              });
            // Heuristic: if it has language- class, treat as block; else inline
            const isInline = !(
              typeof className === "string" && className.includes("language-")
            );
            if (isInline) {
              return (
                <code
                  className={cn("px-1 py-0.5 rounded bg-muted font-mono text-xs", className)}
                  {...rest}
                >
                  {children}
                </code>
              );
            }
            return (
              <code className={cn("font-mono text-xs", className)} {...rest}>
                {children}
              </code>
            );
          },
          blockquote({ className, ...props }) {
            return (
              <blockquote
                className={cn(
                  "border-l-2 pl-4 italic text-muted-foreground",
                  className,
                )}
                {...props}
              />
            );
          },
        }))()}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}


