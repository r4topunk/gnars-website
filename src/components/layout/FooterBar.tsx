"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { Vote } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import { DAO_DESCRIPTION } from "@/lib/config";
import { cn } from "@/lib/utils";

const NOGGLES_ASCII = "⌐◨-◨";

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M18.244 2H21.5l-7.51 8.58L23 22h-6.91l-5.41-6.69L4.4 22H1.144l8.04-9.19L1 2h7.09l4.88 6.13L18.244 2Zm-2.42 18.18h1.92L7.27 3.72H5.21l10.614 16.46Z" />
    </svg>
  );
}

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

export function FooterBar({ className }: { className?: string }) {
  const t = useTranslations("footer");
  const year = new Date().getFullYear();

  const NAV_COLUMNS: ReadonlyArray<{
    key: string;
    title: string;
    links: ReadonlyArray<{ label: string; href: string; external?: boolean }>;
  }> = [
    {
      key: "governance",
      title: t("nav.governance.title"),
      links: [
        { label: t("nav.governance.proposals"), href: "/proposals" },
        { label: t("nav.governance.createProposal"), href: "/propose" },
        { label: t("nav.governance.auctions"), href: "/auctions" },
        { label: t("nav.governance.treasury"), href: "/treasury" },
      ],
    },
    {
      key: "community",
      title: t("nav.community.title"),
      links: [
        { label: t("nav.community.members"), href: "/members" },
        { label: t("nav.community.blogs"), href: "/blogs" },
        { label: t("nav.community.propdates"), href: "/propdates" },
        { label: t("nav.community.bounties"), href: "/community/bounties" },
      ],
    },
    {
      key: "explore",
      title: t("nav.explore.title"),
      links: [
        { label: t("nav.explore.tv"), href: "/tv" },
        { label: t("nav.explore.droposals"), href: "/droposals" },
        { label: t("nav.explore.nogglesRails"), href: "/nogglesrails" },
        { label: t("nav.explore.swap"), href: "/swap" },
        { label: t("nav.explore.boards"), href: "https://boards.wtf/", external: true },
      ],
    },
  ];

  const onCopyNoggles = React.useCallback(async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(NOGGLES_ASCII);
      } else {
        const ok = fallbackCopyTextToClipboard(NOGGLES_ASCII);
        if (!ok) throw new Error("copy failed");
      }
      toast.success(t("noggles.copySuccess"));
    } catch {
      toast.error(t("noggles.copyError"));
    }
  }, [t]);

  return (
    <footer
      className={cn(
        "mt-16 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        className,
      )}
    >
      <div className="mx-auto max-w-6xl px-4 py-12 md:px-6">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4 lg:grid-cols-5">
          {/* Brand */}
          <div className="col-span-2 lg:col-span-2 flex flex-col gap-4">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="flex aspect-square size-9 items-center justify-center overflow-hidden rounded-md bg-black">
                <Image
                  src="/gnars.webp"
                  alt="Gnars DAO"
                  width={64}
                  height={64}
                  className="object-cover w-5 h-5"
                />
              </div>
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="font-semibold text-base">Gnars DAO</span>
                <Badge
                  variant="secondary"
                  className="h-4 w-fit px-1.5 text-[10px] bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200"
                >
                  Base
                </Badge>
              </div>
            </Link>
            <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
              {DAO_DESCRIPTION}.
            </p>
            <div className="flex items-center gap-2">
              <a
                href="https://x.com/gnars_dao"
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t("social.xAriaLabel")}
                title={t("social.xTitle")}
                className="flex size-9 items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <XIcon className="size-4" />
              </a>
              <a
                href="https://snapshot.box/#/s:gnars.eth"
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t("social.snapshotAriaLabel")}
                title={t("social.snapshotTitle")}
                className="flex size-9 items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <Vote className="size-4" />
              </a>
            </div>
          </div>

          {/* Nav columns */}
          {NAV_COLUMNS.map((column) => (
            <div key={column.key} className="flex flex-col gap-3">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {column.title}
              </div>
              <ul className="flex flex-col gap-2">
                {column.links.map((link) => (
                  <li key={link.href}>
                    {link.external ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col-reverse items-center justify-between gap-4 border-t pt-6 sm:flex-row">
          <p className="text-xs text-muted-foreground">{t("copyright", { year })}</p>
          <p className="font-sans text-sm text-muted-foreground">
            {t("madeWith")}{" "}
            <a
              href="#"
              onClick={(event) => {
                event.preventDefault();
                void onCopyNoggles();
              }}
              className="hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              aria-label={t("noggles.copyAriaLabel")}
              title={t("noggles.copyTitle")}
            >
              {NOGGLES_ASCII}
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
