"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { useTranslations } from "next-intl";
import { useMintDroposal } from "@/hooks/useMintDroposal";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { TVChannel } from "./gnars-tv-channels";

/* ────────────────────────────────────────────────────────────────────────────
 * Keycap system
 *
 * Every control is a sculpted vintage cap. The <button> IS the cap's sloped
 * side walls; a first-child <span> at negative z-index is the dished TOP FACE —
 * inset from the footprint and biased toward the top edge, the way a profile
 * cap reads from above. Pressing translates the cap down 5px and collapses the
 * extrusion, so the cap visibly bottoms out on the plate.
 * ──────────────────────────────────────────────────────────────────────────── */

interface Material {
  walls: string;
  wall: string;
  face: string;
  lip: number;
  ink: string;
}

const CREAM: Material = {
  walls: "linear-gradient(180deg,#d5ccb5,#b3aa92 55%,#988f78)",
  wall: "#7d7460",
  face: "linear-gradient(180deg,#c8bfa7 0%,#ded5bf 28%,#efe8d4 66%,#e2d9c0 100%)",
  lip: 0.5,
  ink: "#3a352c",
};
const CHARCOAL: Material = {
  walls: "linear-gradient(180deg,#4c4740,#332f29 55%,#242019)",
  wall: "#141210",
  face: "linear-gradient(180deg,#332f28 0%,#3f3a32 30%,#4b453c 68%,#3a352d 100%)",
  lip: 0.16,
  ink: "#e8e0cd",
};
const GOLD_CAP: Material = {
  walls: "linear-gradient(180deg,#f3b93a,#d3900f 55%,#a86a08)",
  wall: "#7c4e05",
  face: "linear-gradient(180deg,#d8940f 0%,#efb42e 30%,#ffd061 68%,#e5a51d 100%)",
  lip: 0.45,
  ink: "#3a2604",
};

function capStyle(
  m: Material,
  o: { w: number; h: number; fs: number; glow?: string; ink?: string },
): CSSProperties {
  return {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 1,
    width: o.w,
    height: o.h,
    paddingBottom: 6,
    borderRadius: 8,
    border: "1px solid rgba(0,0,0,.68)",
    background: m.walls,
    boxShadow:
      `0 5px 0 ${m.wall},0 8px 8px rgba(0,0,0,.55),inset 0 1px 0 rgba(255,255,255,.32),inset 0 -1px 1px rgba(0,0,0,.35)` +
      (o.glow ? `,0 0 16px ${o.glow}` : ""),
    color: o.ink ?? m.ink,
    fontFamily: "var(--font-oswald), sans-serif",
    fontWeight: 600,
    letterSpacing: ".06em",
    fontSize: o.fs,
    cursor: "pointer",
    transition: "transform .05s, box-shadow .05s",
  };
}

function faceStyle(m: Material): CSSProperties {
  return {
    position: "absolute",
    left: 4,
    right: 4,
    top: 3,
    bottom: 10,
    zIndex: -1,
    borderRadius: "6px 6px 9px 9px",
    background: `radial-gradient(135% 85% at 50% 0%,rgba(0,0,0,.17),rgba(0,0,0,0) 44%),${m.face}`,
    boxShadow: `inset 0 2px 3px rgba(0,0,0,.22),inset 0 -1px 1px rgba(255,255,255,${m.lip}),inset 1px 0 1px rgba(255,255,255,.07),inset -1px 0 2px rgba(0,0,0,.12)`,
  };
}

/**
 * A sculpted cap. Press physics are CSS (`.tv-key:active` in globals.css) so a
 * press repaints without a React round-trip and keyboard activation gets the
 * same travel — a pointer-event handler gave neither.
 */
function Keycap({
  material,
  width,
  height,
  fontSize,
  glow,
  ink,
  onPress,
  ariaLabel,
  disabled,
  className,
  children,
}: {
  material: Material;
  width: number;
  height: number;
  fontSize: number;
  glow?: string;
  ink?: string;
  onPress: () => void;
  ariaLabel: string;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      disabled={disabled}
      aria-label={ariaLabel}
      title={ariaLabel}
      className={`tv-key focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f7c948]/70 ${className ?? ""}`}
      style={capStyle(material, { w: width, h: height, fs: fontSize, glow, ink })}
    >
      <span aria-hidden style={faceStyle(material)} />
      {children}
    </button>
  );
}

/* ──────────────────────────────────────────────────────────────────────────── */

const SILKSCREEN: CSSProperties = {
  fontFamily: "var(--font-geist-mono), monospace",
  fontSize: 9,
  letterSpacing: ".22em",
  color: "#c9c9d2",
  textShadow: "0 -1px 0 rgba(0,0,0,.6)",
};

const ACTION_LEGEND: CSSProperties = { fontSize: 8.5, letterSpacing: ".08em", lineHeight: 1 };

const SCREW_POSITIONS = [
  { left: 17, top: 15 },
  { right: 17, top: 15 },
  { left: 17, bottom: 15 },
  { right: 17, bottom: 15 },
];

/** How long the static burst covers a channel change, ms. */
const TUNE_MS = 240;
/** How long a function key's status stays on the ACTIONS strip, ms. */
const FLASH_MS = 1800;

export interface GnarsTVSetProps {
  channels: TVChannel[];
  /** Two independent marquee rows of real DAO stats. */
  ticker: [string[], string[]];
}

export function GnarsTVSet({ channels, ticker }: GnarsTVSetProps) {
  const t = useTranslations("tv.set");
  const router = useRouter();
  const pathname = usePathname();

  const chassisRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<Record<number, HTMLVideoElement | null>>({});
  const tuneTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  // Starts muted: no browser will autoplay with sound before a gesture.
  const [muted, setMuted] = useState(true);
  const [tuning, setTuning] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  const active = channels[index] ?? channels[0];

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReducedMotion(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  // `?ch=<propNumber>` selects on load. Read once — afterwards the component owns
  // the channel and only writes back.
  useEffect(() => {
    const want = Number(new URLSearchParams(window.location.search).get("ch"));
    if (!want) return;
    const i = channels.findIndex((c) => c.propNumber === want);
    if (i >= 0) setIndex(i);
  }, [channels]);

  useEffect(() => {
    if (!active) return;
    const url = new URL(window.location.href);
    url.searchParams.set("ch", String(active.propNumber));
    window.history.replaceState(null, "", url);
  }, [active]);

  /**
   * Exactly one IPFS stream at a time.
   *
   * The tuned video is the only one that gets `preload="auto"` and `play()`;
   * every other stays paused and muted so eight gateway fetches never race. A
   * rejected `play()` means the autoplay policy refused sound, so we force mute,
   * retry, and push that back into the control — swallowing it would leave a
   * dead screen under a "playing" button.
   */
  const syncVideos = useCallback(() => {
    channels.forEach((_, i) => {
      const el = videoRefs.current[i];
      if (!el) return;
      const isActive = i === index;
      el.muted = isActive ? muted : true;
      if (isActive && playing) {
        if (el.preload !== "auto") el.preload = "auto";
        const p = el.play();
        p?.catch(() => {
          el.muted = true;
          el.play().catch(() => {});
          setMuted(true);
        });
      } else {
        el.pause();
        // Also drop back to `preload="none"`. Pausing stops playback but a
        // previously-tuned element left on "auto" keeps buffering, which is how
        // you end up with several IPFS streams in flight at once.
        if (el.preload !== "none") el.preload = "none";
      }
    });
  }, [channels, index, muted, playing]);

  useEffect(() => {
    syncVideos();
  }, [syncVideos]);

  const tuneTo = useCallback(
    (next: number) => {
      if (channels.length === 0) return;
      const target = ((next % channels.length) + channels.length) % channels.length;
      if (target === index) return;
      setTuning(true);
      clearTimeout(tuneTimer.current);
      tuneTimer.current = setTimeout(() => {
        setIndex(target);
        setTuning(false);
      }, TUNE_MS);
    },
    [channels.length, index],
  );

  const step = useCallback((delta: number) => tuneTo(index + delta), [index, tuneTo]);

  const toggleFullscreen = useCallback(() => {
    const el = chassisRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else el.requestFullscreen?.().catch(() => {});
  }, []);

  useEffect(() => {
    const onFs = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement | null)?.tagName ?? "";
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(tag)) return;
      if ((document.activeElement as HTMLElement | null)?.isContentEditable) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        step(-1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        step(1);
      } else if (e.key === " ") {
        e.preventDefault();
        setPlaying((p) => !p);
      } else if (e.key === "m" || e.key === "M") {
        setMuted((m) => !m);
      } else if (e.key === "f" || e.key === "F") {
        toggleFullscreen();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, toggleFullscreen]);

  useEffect(
    () => () => {
      clearTimeout(tuneTimer.current);
      clearTimeout(flashTimer.current);
    },
    [],
  );

  const flashStatus = useCallback((msg: string) => {
    setFlash(msg);
    clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(null), FLASH_MS);
  }, []);

  /* ── Function keys ─────────────────────────────────────────────────────── */

  /**
   * MINT collects the tuned droposal in place — the wallet prompt comes up over
   * the television, no navigation. `useMintDroposal` owns the whole write path
   * (price + Zora protocol reward, referral, account abstraction, its own
   * toasts), so this only supplies the edition and reports back to the ACTIONS
   * strip. A droposal whose edition address never resolved has nothing to
   * collect from, so that one still routes to its page.
   */
  const { mint, isPending: minting } = useMintDroposal({
    tokenAddress: active?.collectionAddress as `0x${string}` | undefined,
    priceEth: active?.priceEth ?? "0",
    onSuccess: () => flashStatus(t("flashMinted")),
    onError: () => flashStatus(t("flashMintFailed")),
  });

  const onMint = useCallback(() => {
    if (!active) return;
    if (!active.collectionAddress) {
      router.push(`/droposals/${active.propNumber}`);
      return;
    }
    flashStatus(t("flashMinting", { prop: active.propNumber }));
    void mint(1);
  }, [active, flashStatus, mint, router, t]);

  /**
   * Captures the frame currently on screen.
   *
   * Reading pixels back out of a cross-origin video taints the canvas, so this
   * only works because the element carries `crossOrigin="anonymous"` and the
   * gateway answers with CORS headers. When a gateway does not, `toDataURL`
   * throws SecurityError — we fall back to saving the poster instead of failing
   * silently.
   */
  const onShot = useCallback(() => {
    if (!active) return;
    const label = `gnars-tv-ch${String(index + 1).padStart(2, "0")}.png`;
    const save = (canvas: HTMLCanvasElement) => {
      const a = document.createElement("a");
      a.download = label;
      a.href = canvas.toDataURL("image/png");
      a.click();
      flashStatus(t("flashFrameSaved"));
    };
    try {
      const el = videoRefs.current[index];
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("no 2d context");
      if (el && el.videoWidth) {
        canvas.width = el.videoWidth;
        canvas.height = el.videoHeight;
        ctx.drawImage(el, 0, 0);
        save(canvas);
        return;
      }
      if (!active.thumbUrl) throw new Error("nothing to capture");
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          ctx.drawImage(img, 0, 0);
          save(canvas);
        } catch {
          flashStatus(t("flashShotBlocked"));
        }
      };
      img.onerror = () => flashStatus(t("flashShotBlocked"));
      img.src = active.thumbUrl;
    } catch {
      flashStatus(t("flashShotBlocked"));
    }
  }, [active, flashStatus, index, t]);

  const onSave = useCallback(() => {
    const href = active?.videoUrl ?? active?.thumbUrl;
    if (!href) return;
    const a = document.createElement("a");
    a.href = href;
    a.download = `gnars-${active.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
    a.target = "_blank";
    a.rel = "noopener";
    a.click();
    flashStatus(t("flashDownloading"));
  }, [active, flashStatus, t]);

  const onShare = useCallback(async () => {
    if (!active) return;
    const url = `${window.location.origin}${pathname}?ch=${active.propNumber}`;
    const data = {
      title: t("shareTitle", { title: active.title }),
      text: t("shareText", { title: active.title, prop: active.propNumber }),
      url,
    };
    if (navigator.share) {
      try {
        await navigator.share(data);
        flashStatus(t("flashShared"));
        return;
      } catch {
        // Dismissed the sheet — fall through to the clipboard.
      }
    }
    try {
      await navigator.clipboard.writeText(`${data.text} — ${url}`);
      flashStatus(t("flashLinkCopied"));
    } catch {
      flashStatus(t("flashCopyBlocked"));
    }
  }, [active, flashStatus, pathname, t]);

  /* ── Render ────────────────────────────────────────────────────────────── */

  const kenBurns = reducedMotion ? "none" : "tv-kenburns 26s ease-in-out infinite";

  if (!active) return null;

  return (
    <section
      className="flex w-full flex-col items-center px-5 pb-14 pt-8"
      style={{
        background:
          "radial-gradient(70% 55% at 50% 8%,rgba(245,158,11,.13),rgba(0,0,0,0) 62%),#060608",
      }}
    >
      <span
        className="mb-5 flex items-center gap-2 font-bold"
        style={{
          fontFamily: "var(--font-geist-mono), monospace",
          fontSize: 13,
          letterSpacing: ".28em",
          color: "#f7c948",
        }}
      >
        <span
          aria-hidden
          className="size-2 rounded-full bg-red-500"
          style={{ animation: reducedMotion ? "none" : "tv-pulse 1.4s infinite" }}
        />
        {t("onAirLabel")}
      </span>

      {/* ── Outer shell ───────────────────────────────────────────────────── */}
      <div
        ref={chassisRef}
        data-tv-chassis
        className="relative box-border w-full max-w-[1180px] p-2.5 sm:p-[20px_22px_24px]"
        style={{
          borderRadius: fullscreen ? 0 : "clamp(20px,4vw,44px)",
          background:
            "linear-gradient(170deg,#8d8d97,#6b6b75 5%,#55555e 16%,#45464e 36%,#3a3b43 58%,#31323a 80%,#3f4048 94%,#565660)",
          boxShadow:
            "inset 0 2px 2px rgba(255,255,255,.65),inset 0 -3px 7px rgba(0,0,0,.7),inset 3px 0 4px rgba(255,255,255,.12),inset -3px 0 5px rgba(0,0,0,.35),0 2px 0 rgba(255,255,255,.06),0 8px 18px rgba(0,0,0,.35),0 24px 50px rgba(0,0,0,.45),0 56px 110px rgba(0,0,0,.7),0 0 90px rgba(245,158,11,.09)",
          ...(fullscreen
            ? { display: "flex", flexDirection: "column", justifyContent: "center", height: "100%" }
            : {}),
        }}
      >
        {/* Brushed metal grain */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden"
          style={{
            borderRadius: 44,
            backgroundImage: "url('/textures/brushed-metal.png')",
            backgroundSize: "512px",
            mixBlendMode: "soft-light",
            opacity: 0.9,
          }}
        />
        {/* Diagonal light sweep */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            borderRadius: 44,
            background:
              "linear-gradient(120deg,rgba(255,255,255,.22),rgba(255,255,255,.05) 18%,rgba(0,0,0,0) 34%,rgba(0,0,0,.14) 62%,rgba(0,0,0,0) 78%,rgba(255,255,255,.08) 96%)",
          }}
        />
        {/* Top specular line */}
        <div
          aria-hidden
          className="pointer-events-none absolute"
          style={{
            left: "6%",
            right: "6%",
            top: 0,
            height: 3,
            borderRadius: 999,
            background:
              "linear-gradient(90deg,rgba(255,255,255,0),rgba(255,255,255,.55) 30%,rgba(255,255,255,.75) 50%,rgba(255,255,255,.55) 70%,rgba(255,255,255,0))",
          }}
        />
        {/* Ambient occlusion */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            borderRadius: 44,
            background:
              "radial-gradient(circle at 25% 12%,rgba(255,255,255,.13),transparent 32%),radial-gradient(circle at 78% 90%,rgba(0,0,0,.2),transparent 42%)",
          }}
        />
        {/* Bottom seam groove */}
        <div
          aria-hidden
          className="pointer-events-none absolute"
          style={{
            left: 30,
            right: 30,
            bottom: 11,
            height: 2,
            borderRadius: 1,
            background: "linear-gradient(180deg,rgba(0,0,0,.55),rgba(255,255,255,.16))",
          }}
        />
        {/* Corner phillips screws */}
        {SCREW_POSITIONS.map((pos, i) => (
          <span
            key={i}
            aria-hidden
            className="pointer-events-none absolute"
            style={{
              ...pos,
              width: 17,
              height: 17,
              borderRadius: 999,
              background: "radial-gradient(circle at 34% 28%,#a4a4ad,#5a5a62 52%,#2e2e34 88%)",
              boxShadow:
                "inset 0 -1px 2px rgba(0,0,0,.75),inset 0 1px 1px rgba(255,255,255,.5),0 1px 2px rgba(0,0,0,.6)",
            }}
          >
            <span
              className="absolute left-1/2 top-1/2"
              style={{
                width: 9,
                height: 1.5,
                transform: "translate(-50%,-50%)",
                borderRadius: 1,
                background: "rgba(0,0,0,.75)",
                boxShadow: "0 1px 0 rgba(255,255,255,.18)",
              }}
            />
            <span
              className="absolute left-1/2 top-1/2"
              style={{
                width: 1.5,
                height: 9,
                transform: "translate(-50%,-50%)",
                borderRadius: 1,
                background: "rgba(0,0,0,.75)",
                boxShadow: "1px 0 0 rgba(255,255,255,.14)",
              }}
            />
          </span>
        ))}

        {/* ── Inner panel ─────────────────────────────────────────────────── */}
        <div
          className="relative p-2.5 sm:p-[16px_18px_18px]"
          style={{
            borderRadius: "clamp(14px,3vw,30px)",
            background:
              "linear-gradient(175deg,#63636b,#4d4e58 14%,#43444d 38%,#383942 62%,#2d2e35 84%,#34353d)",
            boxShadow:
              "inset 0 1px 1px rgba(255,255,255,.32),inset 0 -3px 8px rgba(0,0,0,.75),inset 2px 0 3px rgba(255,255,255,.06),inset -2px 0 4px rgba(0,0,0,.4),0 2px 4px rgba(0,0,0,.45),0 1px 0 rgba(255,255,255,.08)",
          }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              borderRadius: "clamp(14px,3vw,30px)",
              opacity: 0.45,
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='2'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)' opacity='.09'/%3E%3C/svg%3E\")",
            }}
          />

          {/* Header row */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-1 pb-2.5 pt-0.5 sm:gap-3.5 sm:pb-3.5">
            <span
              className="flex items-center gap-2.5 font-bold"
              style={{
                padding: "7px 15px",
                borderRadius: 999,
                border: "1px solid rgba(0,0,0,.7)",
                background: "linear-gradient(180deg,#0a0a0c,#141417)",
                boxShadow: "inset 0 2px 4px rgba(0,0,0,.9),0 1px 1px rgba(255,255,255,.28)",
                fontFamily: "var(--font-geist-mono), monospace",
                fontSize: 12,
                letterSpacing: ".22em",
                color: "#d4d4d8",
              }}
            >
              <span
                aria-hidden
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: 999,
                  background: "#ef4444",
                  boxShadow: "0 0 8px rgba(239,68,68,.9)",
                  animation: reducedMotion ? "none" : "tv-pulse 1.4s infinite",
                }}
              />
              {t("onAir")}
            </span>

            <span
              style={{
                padding: 3,
                borderRadius: 16,
                background: "linear-gradient(180deg,#8a8a94,#3c3c44 45%,#1a1a1e)",
                boxShadow: "0 2px 5px rgba(0,0,0,.7),inset 0 1px 1px rgba(255,255,255,.35)",
              }}
            >
              <span
                className="block"
                style={{
                  padding: "6px clamp(14px,5vw,44px)",
                  borderRadius: 13,
                  background: "linear-gradient(180deg,#020203,#0c0a10 60%,#120a16)",
                  boxShadow: "inset 0 3px 8px rgba(0,0,0,.95)",
                  fontFamily: "var(--font-geist-mono), monospace",
                  fontSize: "clamp(19px,2.5vw,29px)",
                  letterSpacing: ".28em",
                  fontWeight: 700,
                  color: "#fbdd7e",
                  textShadow:
                    "0 0 12px rgba(247,201,72,1),0 0 36px rgba(245,158,11,.65),0 0 70px rgba(245,158,11,.4)",
                }}
              >
                GNARS TV
              </span>
            </span>

            <span className="flex items-center gap-4">
              <span aria-hidden className="hidden flex-col gap-1 sm:flex">
                {[0, 1, 2, 3].map((i) => (
                  <span
                    key={i}
                    style={{
                      width: 120,
                      height: 4,
                      borderRadius: 2,
                      background: "linear-gradient(180deg,#060607,#1c1c21)",
                      boxShadow: "0 1px 0 rgba(255,255,255,.25)",
                    }}
                  />
                ))}
              </span>
              <span className="hidden flex-col items-center gap-1 sm:flex">
                <span style={SILKSCREEN}>{t("power")}</span>
                <span
                  aria-hidden
                  style={{
                    width: 16,
                    height: 7,
                    borderRadius: 4,
                    background: "#4ade80",
                    boxShadow: "0 0 8px rgba(74,222,128,.9),inset 0 1px 1px rgba(255,255,255,.5)",
                  }}
                />
              </span>
            </span>
          </div>

          {/* Screen + guide */}
          <div className="flex flex-wrap items-stretch gap-3 sm:gap-4">
            <div className="relative min-w-0 flex-[1.65_1_320px] md:flex-[1.65_1_560px]">
              <div
                className="relative p-2.5 sm:p-[26px]"
                style={{
                  borderRadius: "clamp(16px,3vw,36px)",
                  background:
                    "linear-gradient(172deg,#3a3a40,#26262c 24%,#1b1b20 52%,#141418 80%,#1d1d22)",
                  boxShadow:
                    "inset 0 2px 3px rgba(255,255,255,.09),inset 0 -9px 18px rgba(0,0,0,.65),inset 2px 0 3px rgba(255,255,255,.03),inset -2px 0 4px rgba(0,0,0,.5),0 12px 24px rgba(0,0,0,.45),0 1px 0 rgba(255,255,255,.09)",
                }}
              >
                {/* ── The tube ─────────────────────────────────────────── */}
                <div
                  data-tv-screen
                  style={{
                    position: "relative",
                    aspectRatio: "16 / 10.6",
                    borderRadius: "34px 34px 38px 38px / 40px 40px 44px 44px",
                    overflow: "hidden",
                    background: "#0d0d0f",
                    boxShadow:
                      "inset 0 0 0 2px rgba(0,0,0,.9),inset 0 4px 20px rgba(0,0,0,.9),inset 0 0 60px rgba(0,0,0,.8),inset 0 0 140px rgba(0,0,0,.5)",
                  }}
                >
                  {/* Poster layers — also the Ken-Burns still for video-less channels */}
                  {channels.map((c, i) => (
                    <div
                      key={`poster-${c.propNumber}`}
                      aria-hidden
                      style={{
                        position: "absolute",
                        inset: 0,
                        backgroundImage: c.thumbUrl ? `url("${c.thumbUrl}")` : undefined,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        backgroundRepeat: "no-repeat",
                        backgroundColor: "#000",
                        opacity: i === index ? 1 : 0,
                        transition: "opacity .3s",
                        animation: i === index && playing && !c.videoUrl ? kenBurns : "none",
                      }}
                    />
                  ))}

                  {/* Video layers. crossOrigin is what makes SHOT possible. */}
                  {channels.map((c, i) =>
                    c.videoUrl ? (
                      <video
                        key={`video-${c.propNumber}`}
                        ref={(el) => {
                          videoRefs.current[i] = el;
                        }}
                        src={c.videoUrl}
                        poster={c.thumbUrl}
                        loop
                        muted
                        playsInline
                        preload="none"
                        crossOrigin="anonymous"
                        style={{
                          position: "absolute",
                          inset: 0,
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          background: "#000",
                          opacity: i === index ? 1 : 0,
                          transition: "opacity .3s",
                          pointerEvents: "none",
                        }}
                      />
                    ) : null,
                  )}

                  {/* Scanlines */}
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0"
                    style={{
                      background:
                        "repeating-linear-gradient(0deg,rgba(0,0,0,.22) 0 1px,transparent 1px 3px)",
                      mixBlendMode: "multiply",
                    }}
                  />
                  {/* Edge vignette */}
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0"
                    style={{
                      background:
                        "radial-gradient(140% 110% at 50% 50%,rgba(0,0,0,0) 55%,rgba(0,0,0,.55) 100%)",
                    }}
                  />
                  {/* Rotated specular ellipse */}
                  <div
                    aria-hidden
                    className="pointer-events-none absolute"
                    style={{
                      left: "-6%",
                      top: "-14%",
                      width: "55%",
                      height: "52%",
                      borderRadius: "50%",
                      background:
                        "radial-gradient(closest-side,rgba(255,255,255,.13),rgba(255,255,255,.05) 55%,rgba(255,255,255,0))",
                      transform: "rotate(-14deg)",
                    }}
                  />
                  {/* Convex glass */}
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0"
                    style={{
                      background:
                        "radial-gradient(circle at 20% 10%,rgba(255,255,255,.09),transparent 26%),radial-gradient(circle at 50% 118%,rgba(255,255,255,.05),transparent 42%),linear-gradient(180deg,rgba(255,255,255,.035),rgba(0,0,0,.09))",
                    }}
                  />
                  {/* Static burst */}
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0"
                    style={{
                      opacity: tuning ? 1 : 0,
                      transition: "opacity .1s",
                      background:
                        "repeating-linear-gradient(0deg,#1a1a1e 0 2px,#3a3a42 2px 3px,#0c0c0e 3px 5px),repeating-linear-gradient(90deg,rgba(255,255,255,.08) 0 1px,transparent 1px 4px)",
                      animation: reducedMotion ? "none" : "tv-static .12s steps(2) infinite",
                    }}
                  />

                  {/* MUTE OSD */}
                  <span
                    aria-hidden
                    className="pointer-events-none absolute"
                    style={{
                      right: 10,
                      top: 9,
                      padding: "4px 9px",
                      borderRadius: 8,
                      background: "rgba(8,8,10,.8)",
                      border: "1px solid rgba(247,201,72,.35)",
                      fontFamily: "var(--font-geist-mono), monospace",
                      fontSize: 11.5,
                      fontWeight: 700,
                      letterSpacing: ".14em",
                      color: "#f7c948",
                      opacity: muted ? 1 : 0,
                      transition: "opacity .2s",
                    }}
                  >
                    🔇 {t("mute")}
                  </span>

                  {/* Phone tuning: the guide is gone below `md`, so the glass
                      carries the only way to change channel by pointer. */}
                  <button
                    type="button"
                    onClick={() => step(-1)}
                    aria-label={t("prevChannel")}
                    className="tv-key absolute left-2 top-1/2 z-10 flex size-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/55 text-neutral-200 backdrop-blur-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f7c948]/70 md:hidden"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={() => step(1)}
                    aria-label={t("nextChannel")}
                    className="tv-key absolute right-2 top-1/2 z-10 flex size-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/55 text-neutral-200 backdrop-blur-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f7c948]/70 md:hidden"
                  >
                    ›
                  </button>

                  {/* Channel indicator */}
                  <span
                    className="absolute flex max-w-[80%] items-center gap-2.5"
                    style={{
                      left: 10,
                      bottom: 9,
                      padding: "5px 11px",
                      borderRadius: 999,
                      background: "rgba(8,8,10,.78)",
                      backdropFilter: "blur(5px)",
                      border: "1px solid rgba(255,255,255,.1)",
                      fontFamily: "var(--font-geist-mono), monospace",
                      fontSize: 12,
                      color: "#d4d4d8",
                    }}
                  >
                    <span
                      aria-hidden
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: 999,
                        background: "#f7c948",
                        boxShadow: "0 0 7px rgba(247,201,72,.9)",
                      }}
                    />
                    <span style={{ color: "#f7c948", fontWeight: 700 }}>
                      {t("ch")} {String(index + 1).padStart(2, "0")}
                    </span>
                    <span
                      className="truncate"
                      style={{
                        fontFamily: "var(--font-geist-sans), sans-serif",
                        fontWeight: 600,
                        color: "#fafafa",
                      }}
                    >
                      {active.title}
                    </span>
                  </span>
                </div>
              </div>
            </div>

            {/* ── Channel guide ──────────────────────────────────────────── */}
            {/* The guide is hidden below `md`: at phone width it stacked under
                the set as a second full-height panel, which doubled the object's
                height and pushed the picture off screen. Tuning moves to the
                arrows on the glass, and the CH pill still names the channel. */}
            <div
              className="hidden min-w-[260px] flex-[1_1_280px] flex-col overflow-hidden md:flex"
              style={{
                borderRadius: 18,
                background: "linear-gradient(180deg,#0c0c0f,#08080a)",
                border: "1px solid rgba(0,0,0,.85)",
                boxShadow:
                  "inset 0 5px 12px rgba(0,0,0,.95),inset 0 -1px 0 rgba(255,255,255,.05),inset 2px 0 4px rgba(0,0,0,.5),0 1px 1px rgba(255,255,255,.25),0 -1px 2px rgba(0,0,0,.5)",
              }}
            >
              <div
                className="flex items-center justify-between"
                style={{ padding: "13px 15px", borderBottom: "1px solid rgba(255,255,255,.08)" }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-geist-mono), monospace",
                    fontSize: 12,
                    letterSpacing: ".24em",
                    fontWeight: 700,
                    color: "#d4d4d8",
                  }}
                >
                  {t("channelGuide")}
                </span>
                <span
                  aria-hidden
                  className="flex items-center gap-1.5"
                  style={{
                    padding: "5px 11px 7px",
                    borderRadius: 7,
                    border: "1px solid rgba(0,0,0,.68)",
                    background: CHARCOAL.walls,
                    boxShadow:
                      "0 3px 0 #141210,0 5px 5px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.3)",
                    fontFamily: "var(--font-oswald), sans-serif",
                    fontSize: 11,
                    letterSpacing: ".14em",
                    fontWeight: 600,
                    color: CHARCOAL.ink,
                  }}
                >
                  {t("all")} <span style={{ fontSize: 8 }}>▼</span>
                </span>
              </div>

              <div className="flex min-h-[280px] max-h-[420px] flex-1 flex-col gap-[3px] overflow-y-auto p-2 [scrollbar-color:#f5a623_#1a1a1e] [scrollbar-width:thin]">
                {channels.map((c, i) => {
                  const on = i === index;
                  return (
                    <button
                      key={c.propNumber}
                      type="button"
                      onClick={() => tuneTo(i)}
                      aria-label={t("tuneTo", { no: c.no, title: c.title })}
                      aria-current={on ? "true" : undefined}
                      className="flex items-center gap-2 px-2.5 py-2.5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#f7c948]/60 sm:gap-3 sm:px-3"
                      style={{
                        borderRadius: 12,
                        border: on
                          ? "2px solid rgba(247,201,72,.8)"
                          : "1px solid rgba(255,255,255,.05)",
                        background: on
                          ? "linear-gradient(180deg,rgba(245,158,11,.3),rgba(120,70,10,.22))"
                          : "rgba(255,255,255,.015)",
                        boxShadow: on
                          ? "0 0 18px rgba(245,158,11,.4),inset 0 1px 0 rgba(255,255,255,.12)"
                          : "none",
                        cursor: "pointer",
                        fontFamily: "inherit",
                        transition: "border-color .15s",
                      }}
                    >
                      {/* Below `sm` the channel number is dropped and the thumb
                          shrinks: at 360px the fixed columns left the title 34px
                          and every row read as a single letter. The gold border
                          and the on-screen CH pill still say which is tuned. */}
                      <span
                        aria-hidden
                        className="hidden w-[30px] shrink-0 sm:block"
                        style={{
                          fontFamily: "var(--font-geist-mono), monospace",
                          fontSize: 14,
                          fontWeight: 700,
                          color: on ? "#f7c948" : "#71717a",
                        }}
                      >
                        {String(c.no).padStart(2, "0")}
                      </span>
                      {/* eslint-disable-next-line @next/next/no-img-element -- IPFS gateway art; next/image adds no value at 56px behind a lazy attribute */}
                      <img
                        src={c.thumbUrl}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="size-11 shrink-0 object-cover sm:h-[42px] sm:w-14"
                        style={{
                          borderRadius: 8,
                          border: on
                            ? "1px solid rgba(247,201,72,.5)"
                            : "1px solid rgba(255,255,255,.12)",
                          backgroundColor: "#131316",
                          boxShadow: "0 2px 5px rgba(0,0,0,.6)",
                        }}
                      />
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5 text-left">
                        <span
                          className="truncate"
                          style={{ fontSize: 13, fontWeight: 700, color: "#fafafa" }}
                        >
                          {c.title}
                        </span>
                        <span
                          className="truncate"
                          style={{
                            fontFamily: "var(--font-geist-mono), monospace",
                            fontSize: 10.5,
                            color: "#8e8e96",
                          }}
                        >
                          #{c.propNumber} · gnars
                        </span>
                      </span>
                      <span
                        className="shrink-0 whitespace-nowrap text-[10.5px] sm:text-[11.5px]"
                        style={{
                          fontFamily: "var(--font-geist-mono), monospace",
                          fontWeight: 700,
                          color: "#e5e5e5",
                        }}
                      >
                        {c.priceEth} ETH
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Control deck ───────────────────────────────────────────────── */}
          <div className="mt-3 flex flex-wrap items-center gap-3 px-1 pb-0.5 pt-2.5 sm:mt-4 sm:gap-4 sm:pt-3.5">
            <span className="flex shrink-0 flex-col gap-px">
              <span
                style={{
                  fontSize: 19,
                  fontWeight: 900,
                  letterSpacing: ".08em",
                  color: "#c9c9cf",
                  textShadow: "0 -1px 0 rgba(0,0,0,.7),0 1px 0 rgba(255,255,255,.14)",
                }}
              >
                GNARS
              </span>
              <span
                style={{ ...SILKSCREEN, fontSize: 7.5, letterSpacing: ".18em", color: "#9a9aa2" }}
              >
                {t("broadcastSystem")}
              </span>
              <span
                style={{ ...SILKSCREEN, fontSize: 7.5, letterSpacing: ".18em", color: "#7e7e88" }}
              >
                {t("modelYear")}
              </span>
            </span>

            {/* Recessed glass ticker */}
            <span
              className="flex min-w-[250px] flex-1 flex-col justify-center gap-2.5 overflow-hidden"
              style={{
                padding: "13px 4px",
                borderRadius: 10,
                background: "linear-gradient(180deg,#050506,#0d0a10)",
                border: "1px solid rgba(0,0,0,.75)",
                boxShadow: "inset 0 3px 8px rgba(0,0,0,.95),0 1px 1px rgba(255,255,255,.25)",
              }}
            >
              {ticker.map((items, row) => (
                <span key={row} className="flex w-full overflow-hidden">
                  <span
                    className="flex"
                    style={{
                      width: "max-content",
                      animation: reducedMotion
                        ? "none"
                        : `tv-marquee ${row === 0 ? 30 : 38}s linear infinite`,
                    }}
                  >
                    {[...items, ...items].map((text, i) => (
                      <span
                        key={`${row}-${i}`}
                        style={{
                          padding: "0 20px",
                          fontFamily: "var(--font-geist-mono), monospace",
                          fontSize: 11.5,
                          letterSpacing: ".1em",
                          fontWeight: 600,
                          color: "#f7c948",
                          textShadow: "0 0 8px rgba(247,201,72,.55)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {text}
                      </span>
                    ))}
                  </span>
                </span>
              ))}
            </span>

            {/* Right cluster */}
            <span className="flex flex-wrap items-end gap-3 sm:ml-auto sm:gap-4">
              <span className="flex flex-col items-center gap-[7px]">
                <span
                  className="flex gap-2"
                  style={{
                    padding: 6,
                    borderRadius: 14,
                    background: "linear-gradient(180deg,#101013,#1a1a1f)",
                    boxShadow: "inset 0 2px 5px rgba(0,0,0,.85),0 1px 1px rgba(255,255,255,.22)",
                  }}
                >
                  {/* Written out rather than mapped: each handler closes over
                      `videoRefs`, and an array of ref-reading closures built in
                      render is exactly what the refs lint rule forbids. */}
                  <Keycap
                    material={GOLD_CAP}
                    glow="rgba(247,201,72,.3)"
                    width={52}
                    height={46}
                    fontSize={9}
                    onPress={onMint}
                    disabled={minting}
                    ariaLabel={t("mintAria", { prop: active.propNumber })}
                  >
                    <span style={{ fontSize: 14, lineHeight: 1 }}>⌐◨-◨</span>
                    <span style={ACTION_LEGEND}>{minting ? t("minting") : t("mint")}</span>
                  </Keycap>
                  <Keycap
                    material={CREAM}
                    width={52}
                    height={46}
                    fontSize={14}
                    onPress={onShot}
                    ariaLabel={t("shotAria")}
                  >
                    <span style={{ fontSize: 14, lineHeight: 1 }}>📷</span>
                    <span style={ACTION_LEGEND}>{t("shot")}</span>
                  </Keycap>
                  <Keycap
                    material={CREAM}
                    width={52}
                    height={46}
                    fontSize={14}
                    onPress={onSave}
                    ariaLabel={t("saveAria")}
                  >
                    <span style={{ fontSize: 14, lineHeight: 1 }}>⇩</span>
                    <span style={ACTION_LEGEND}>{t("save")}</span>
                  </Keycap>
                  <Keycap
                    material={CREAM}
                    width={52}
                    height={46}
                    fontSize={14}
                    onPress={onShare}
                    ariaLabel={t("shareAria")}
                  >
                    <span style={{ fontSize: 14, lineHeight: 1 }}>⤴</span>
                    <span style={ACTION_LEGEND}>{t("share")}</span>
                  </Keycap>
                </span>
                <span aria-live="polite" style={SILKSCREEN}>
                  {flash ? flash.toUpperCase() : t("actions")}
                </span>
              </span>

              <span className="flex flex-col items-center gap-1.5">
                <span style={SILKSCREEN}>{t("playPause")}</span>
                <Keycap
                  material={GOLD_CAP}
                  glow="rgba(247,201,72,.35)"
                  width={96}
                  height={46}
                  fontSize={14}
                  onPress={() => setPlaying((p) => !p)}
                  ariaLabel={playing ? t("pause") : t("play")}
                >
                  {playing ? `❚❚ ${t("pause")}` : `▶ ${t("play")}`}
                </Keycap>
              </span>

              <span className="flex flex-col items-center gap-1.5">
                <span style={SILKSCREEN}>{t("mute")}</span>
                <Keycap
                  material={CHARCOAL}
                  ink={muted ? "#f7c948" : CHARCOAL.ink}
                  glow={muted ? "rgba(245,158,11,.35)" : undefined}
                  width={50}
                  height={46}
                  fontSize={15}
                  onPress={() => setMuted((m) => !m)}
                  ariaLabel={muted ? t("unmute") : t("mute")}
                >
                  {muted ? "🔇" : "🔊"}
                </Keycap>
              </span>

              <span className="flex flex-col items-center gap-1.5">
                <span style={SILKSCREEN}>{t("fullscreen")}</span>
                <Keycap
                  material={CHARCOAL}
                  width={50}
                  height={46}
                  fontSize={15}
                  onPress={toggleFullscreen}
                  ariaLabel={fullscreen ? t("exitFullscreen") : t("fullscreen")}
                >
                  ⛶
                </Keycap>
              </span>
            </span>
          </div>

          <p
            className="mt-3 px-1 text-center"
            style={{
              fontFamily: "var(--font-geist-mono), monospace",
              fontSize: 10,
              letterSpacing: ".14em",
              color: "#8e8e96",
              textShadow: "0 -1px 0 rgba(0,0,0,.6)",
            }}
          >
            {t("keyboardHint")}
          </p>
        </div>
      </div>
    </section>
  );
}
