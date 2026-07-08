"use client";

import React from "react";

// Per-variant color palette — front shell and back shell colors
const VARIANTS: Record<
  string,
  {
    frontTop: string;
    frontMid: string;
    frontBot: string;
    backTop: string;
    backMid: string;
    backBot: string;
    backSparkle: string;
    rimTint: string;
  }
> = {
  Classic: {
    frontTop: "#16161a",
    frontMid: "#0a0a0c",
    frontBot: "#050507",
    backTop: "#6a6a70",
    backMid: "#57575c",
    backBot: "#38383c",
    backSparkle:
      "radial-gradient(ellipse at 30% 35%, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 55%)",
    rimTint: "rgba(40,80,150,0.35)",
  },
  Red: {
    frontTop: "#2a0a08",
    frontMid: "#1a0504",
    frontBot: "#0d0202",
    backTop: "#c03028",
    backMid: "#902018",
    backBot: "#5c100c",
    backSparkle:
      "radial-gradient(ellipse at 30% 35%, rgba(255,200,200,0.10) 0%, rgba(255,255,255,0) 55%)",
    rimTint: "rgba(180,30,20,0.45)",
  },
  Green: {
    frontTop: "#0a1a0a",
    frontMid: "#05100a",
    frontBot: "#030805",
    backTop: "#28a050",
    backMid: "#1a7838",
    backBot: "#0e4820",
    backSparkle:
      "radial-gradient(ellipse at 30% 35%, rgba(180,255,200,0.10) 0%, rgba(255,255,255,0) 55%)",
    rimTint: "rgba(30,150,60,0.45)",
  },
  Gold: {
    frontTop: "#1a1408",
    frontMid: "#0f0d05",
    frontBot: "#080602",
    backTop: "#d8b060",
    backMid: "#b08840",
    backBot: "#806020",
    backSparkle:
      "radial-gradient(ellipse at 30% 35%, rgba(255,230,160,0.12) 0%, rgba(255,255,255,0) 55%)",
    rimTint: "rgba(200,160,40,0.45)",
  },
  Silver: {
    frontTop: "#1c1c22",
    frontMid: "#101014",
    frontBot: "#080808",
    backTop: "#b0bcc8",
    backMid: "#8898a8",
    backBot: "#606878",
    backSparkle:
      "radial-gradient(ellipse at 30% 35%, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0) 55%)",
    rimTint: "rgba(120,160,200,0.35)",
  },
};

/** Variant names the device understands. Product variant titles must match these. */
export const KEEPKEY_VARIANTS = Object.keys(VARIANTS);

const ALU_GRAIN =
  "repeating-linear-gradient(92deg, rgba(255,255,255,0.022) 0px, rgba(255,255,255,0.022) 1px, rgba(0,0,0,0.03) 1px, rgba(0,0,0,0.03) 2px)";

const SHELL_BLACK = 0.56; // front-shell fraction of each edge

type FacePos = { position: "absolute"; left: "50%"; top: "50%" };
const faceBase: FacePos = { position: "absolute", left: "50%", top: "50%" };

function Face({
  w,
  h,
  transform,
  children,
  style,
}: {
  w: number;
  h: number;
  transform: string;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        ...faceBase,
        width: w,
        height: h,
        marginLeft: -w / 2,
        marginTop: -h / 2,
        transform,
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden" as const,
        boxSizing: "border-box",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// Shared split-edge layout: frontShell + backShell (per-variant gradients passed in)
function SplitEdgeV({
  flip = false,
  glossFront,
  matteBack,
}: {
  flip?: boolean;
  glossFront: string;
  matteBack: string;
}) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: flip ? "column-reverse" : "column",
        borderRadius: 3,
        overflow: "hidden",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.14), inset 0 -1px 2px rgba(0,0,0,0.55), 0 0 0 1px rgba(0,0,0,0.5)",
        position: "relative",
      }}
    >
      <div
        style={{ height: `${SHELL_BLACK * 100}%`, background: glossFront, position: "relative" }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0) 50%, rgba(255,255,255,0.04) 100%)",
          }}
        />
      </div>
      <div
        style={{
          height: `${(1 - SHELL_BLACK) * 100}%`,
          background: matteBack,
          position: "relative",
        }}
      >
        <div style={{ position: "absolute", inset: 0, background: ALU_GRAIN, opacity: 0.6 }} />
      </div>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          [flip ? "bottom" : "top"]: `${SHELL_BLACK * 100}%`,
          height: 1,
          background: "rgba(0,0,0,0.7)",
          boxShadow: flip ? undefined : "0 1px 0 rgba(255,255,255,0.06)",
        }}
      />
    </div>
  );
}

function SplitEdgeH({
  flip = false,
  glossFront,
  matteBack,
}: {
  flip?: boolean;
  glossFront: string;
  matteBack: string;
}) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: flip ? "row-reverse" : "row",
        borderRadius: 3,
        overflow: "hidden",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.14), inset 0 -1px 2px rgba(0,0,0,0.55), 0 0 0 1px rgba(0,0,0,0.5)",
        position: "relative",
      }}
    >
      <div
        style={{
          width: `${SHELL_BLACK * 100}%`,
          height: "100%",
          background: glossFront,
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(90deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0) 50%)",
          }}
        />
      </div>
      <div
        style={{
          width: `${(1 - SHELL_BLACK) * 100}%`,
          height: "100%",
          background: matteBack,
          position: "relative",
        }}
      >
        <div style={{ position: "absolute", inset: 0, background: ALU_GRAIN, opacity: 0.6 }} />
      </div>
      <div
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          [flip ? "right" : "left"]: `${SHELL_BLACK * 100}%`,
          width: 1,
          background: "rgba(0,0,0,0.7)",
        }}
      />
    </div>
  );
}

interface Props {
  variant?: string;
  duration?: number;
}

export default function KeepKeyDevice3D({ variant = "Classic", duration = 12 }: Props) {
  const L = 380; // length
  const W = 158; // width
  const D = 44; // depth

  const c = VARIANTS[variant] ?? VARIANTS.Classic;

  const glossFront = `linear-gradient(180deg, ${c.frontTop} 0%, ${c.frontMid} 40%, ${c.frontBot} 100%)`;
  const glossHi =
    "linear-gradient(120deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0) 28%, rgba(255,255,255,0) 72%, rgba(255,255,255,0.06) 100%)";
  const matteBack = `linear-gradient(180deg, ${c.backTop} 0%, ${c.backMid} 35%, ${c.backBot} 100%)`;

  return (
    <div
      style={{
        width: "100%",
        aspectRatio: "800 / 420",
        containerType: "inline-size",
        position: "relative",
      }}
    >
      {/* Fixed 800×420 canvas scaled to fill the container width — keeps the device proportional at any size */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 800,
          height: 420,
          transformOrigin: "top left",
          // length / length → unitless number (scale() rejects a bare length)
          transform: "scale(calc(100cqw / 800px))",
          perspective: 2400,
          perspectiveOrigin: "50% 42%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Floor shadow */}
        <div
          style={{
            position: "absolute",
            bottom: "14%",
            left: "50%",
            width: L * 0.88,
            height: 30,
            marginLeft: -(L * 0.88) / 2,
            background:
              "radial-gradient(ellipse at center, rgba(0,0,0,0.42) 0%, rgba(0,0,0,0) 65%)",
            filter: "blur(7px)",
            pointerEvents: "none",
          }}
        />

        {/* 3-D box */}
        <div
          style={{
            position: "relative",
            width: L,
            height: W,
            transformStyle: "preserve-3d",
            animation: `kkSpin360 ${duration}s linear infinite`,
            willChange: "transform",
          }}
        >
          {/* FRONT — glossy shell with OLED screen */}
          <Face w={L} h={W} transform={`translateZ(${D / 2}px)`}>
            <div
              style={{
                width: "100%",
                height: "100%",
                background: glossFront,
                borderRadius: 3,
                boxShadow:
                  "inset 0 1px 0 rgba(255,255,255,0.10), inset 0 -1px 0 rgba(0,0,0,0.7), 0 0 0 1px rgba(0,0,0,0.6)",
                position: "relative",
                overflow: "hidden",
                color: "#e8e6dc",
                fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
                padding: "14px 22px",
                boxSizing: "border-box",
                display: "flex",
                alignItems: "center",
              }}
            >
              {/* OLED pixel grid */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "repeating-linear-gradient(0deg, rgba(232,230,220,0.035) 0px, rgba(232,230,220,0.035) 1px, transparent 1px, transparent 2px)",
                  pointerEvents: "none",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: glossHi,
                  pointerEvents: "none",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: "-8%",
                  top: "-30%",
                  width: "55%",
                  height: "90%",
                  background:
                    "radial-gradient(ellipse at center, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0) 60%)",
                  pointerEvents: "none",
                }}
              />
              {/* Screen content */}
              <div
                style={{
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  gap: 18,
                  width: "100%",
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, opacity: 0.55, letterSpacing: 2, marginBottom: 4 }}>
                    CONFIRM SEND
                  </div>
                  <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: 0.5, lineHeight: 1 }}>
                    0.02400 BTC
                  </div>
                  <div style={{ fontSize: 10, opacity: 0.55, letterSpacing: 1, marginTop: 6 }}>
                    TO bc1q··7v3x··x4kp
                  </div>
                  <div style={{ fontSize: 9, opacity: 0.4, letterSpacing: 1, marginTop: 3 }}>
                    FEE 1,240 sats
                  </div>
                </div>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: "50%",
                    border: "1.5px solid rgba(232,230,220,0.85)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 14,
                  }}
                >
                  ▶
                </div>
              </div>
            </div>
          </Face>

          {/* BACK — matte shell + KeepKey wordmark */}
          <Face w={L} h={W} transform={`translateZ(${-D / 2}px) rotateY(180deg)`}>
            <div
              style={{
                width: "100%",
                height: "100%",
                background: matteBack,
                borderRadius: 3,
                boxShadow: `inset 0 0 0 1px ${c.rimTint}, inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -1px 0 rgba(0,0,0,0.5)`,
                display: "flex",
                alignItems: "center",
                padding: "0 0 0 36px",
                boxSizing: "border-box",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: c.backSparkle,
                  borderRadius: 3,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: ALU_GRAIN,
                  borderRadius: 3,
                  opacity: 0.7,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: 3,
                  boxShadow: `inset 0 0 0 2px rgba(40,80,150,0.18)`,
                  pointerEvents: "none",
                }}
              />
              {/* Etched KeepKey wordmark */}
              <svg
                viewBox="0 0 3000 3000"
                width="112"
                height="112"
                style={{
                  display: "block",
                  position: "relative",
                  opacity: 0.58,
                  filter: "drop-shadow(0 1px 0 rgba(255,255,255,0.06))",
                }}
              >
                <g transform="translate(0,3000) scale(0.1,-0.1)" fill="#8a8a90">
                  <path d="M3487 25043 c-4 -3 -7 -3862 -7 -8575 l0 -8568 505 0 505 0 0 1500 c0 964 3 1500 10 1500 5 0 629 -675 1387 -1500 l1378 -1500 705 0 704 0 -56 57 c-31 32 -734 760 -1562 1618 l-1506 1559 53 56 c194 199 2806 2920 2821 2938 l19 22 -656 0 -656 0 -1311 -1430 c-721 -787 -1315 -1430 -1320 -1430 -6 0 -10 1379 -10 3750 0 2994 3 3750 13 3749 6 0 631 -675 1387 -1499 l1375 -1499 704 -1 704 0 -24 26 c-13 14 -716 742 -1561 1618 l-1537 1591 73 75 c40 41 693 720 1450 1508 l1376 1432 -659 0 -658 0 -1309 -1429 c-720 -786 -1315 -1430 -1321 -1430 -10 -1 -13 595 -15 2932 l-3 2932 -496 3 c-272 1 -499 -1 -502 -5z" />
                  <path d="M11895 22179 c-551 -52 -1013 -234 -1429 -562 -120 -95 -384 -358 -480 -477 -37 -47 -111 -150 -164 -230 -370 -554 -552 -1225 -552 -2032 0 -843 185 -1569 533 -2090 555 -831 1423 -1211 2607 -1139 712 43 1267 201 1735 494 50 31 102 66 118 79 l27 23 -2 467 -3 468 -120 -88 c-398 -290 -851 -484 -1308 -561 -355 -60 -779 -53 -1087 20 -533 124 -957 455 -1197 932 -152 303 -226 615 -259 1085 l-6 92 2206 0 2206 0 0 399 c0 523 -16 726 -85 1066 -141 694 -465 1249 -935 1601 -315 237 -690 380 -1145 439 -146 19 -523 27 -660 14z m568 -863 c205 -39 407 -120 565 -228 98 -67 250 -219 325 -325 200 -281 316 -661 334 -1090 l6 -153 -1681 0 -1682 0 0 26 c0 45 50 273 87 394 221 732 744 1251 1380 1369 155 29 158 29 378 26 130 -2 230 -9 288 -19z" />
                  <path d="M17445 22180 c-657 -54 -1222 -318 -1695 -790 -550 -550 -858 -1253 -929 -2123 -14 -164 -14 -613 -1 -788 61 -791 281 -1415 667 -1894 103 -128 311 -330 433 -421 370 -277 782 -434 1314 -501 162 -21 676 -23 871 -5 676 65 1186 228 1633 521 l92 61 0 471 c0 259 -4 469 -8 467 -4 -1 -54 -37 -110 -78 -160 -118 -302 -204 -497 -300 -408 -201 -790 -295 -1246 -307 -534 -14 -918 84 -1285 328 -156 104 -343 293 -453 458 -227 341 -349 747 -377 1254 l-7 127 2208 0 2207 0 -5 458 c-3 330 -9 497 -21 601 -83 722 -292 1258 -659 1687 -398 465 -936 719 -1636 774 -149 11 -357 11 -496 0z m479 -855 c245 -32 441 -104 622 -226 414 -279 647 -773 680 -1444 l7 -135 -1686 0 c-928 0 -1687 2 -1687 5 0 25 57 285 80 370 179 636 592 1129 1122 1339 95 37 244 75 357 91 130 18 372 18 505 0z" />
                  <path d="M23765 22184 c-187 -19 -256 -28 -361 -49 -340 -68 -645 -202 -916 -402 -129 -96 -390 -356 -489 -488 -41 -55 -104 -146 -139 -202 -36 -56 -68 -103 -72 -103 -5 0 -8 248 -8 550 l0 550 -505 0 -505 0 0 -4565 0 -4565 503 2 502 3 3 1888 c1 1038 6 1887 11 1887 4 0 30 -33 56 -72 306 -464 731 -775 1230 -903 212 -54 338 -69 605 -69 305 -1 486 20 750 85 1039 256 1782 1148 2014 2419 54 295 76 569 76 940 0 486 -44 844 -151 1221 -156 553 -455 1040 -830 1350 -340 283 -713 440 -1194 504 -114 15 -494 28 -580 19z m285 -869 c428 -77 776 -298 1033 -656 89 -124 213 -373 264 -529 104 -319 143 -600 143 -1035 0 -453 -45 -811 -145 -1154 -198 -682 -622 -1173 -1168 -1356 -456 -152 -1014 -122 -1412 77 -525 263 -890 788 -970 1396 -22 163 -22 1300 0 1484 57 491 247 913 560 1246 150 159 312 278 509 373 189 91 342 135 566 164 143 19 491 13 620 -10z" />
                  <path d="M11895 14289 c-541 -51 -983 -221 -1400 -538 -127 -96 -418 -384 -524 -519 -410 -520 -633 -1134 -692 -1902 -15 -196 -6 -691 15 -890 90 -822 350 -1441 804 -1912 410 -425 938 -676 1587 -753 297 -35 722 -29 1080 16 549 69 1034 236 1410 483 l115 76 0 470 c0 374 -3 470 -12 464 -7 -4 -38 -27 -68 -50 -110 -84 -328 -220 -466 -291 -378 -196 -728 -298 -1144 -334 -166 -14 -506 -6 -645 15 -323 51 -601 158 -835 324 -122 86 -316 280 -402 402 -73 103 -178 298 -228 425 -93 234 -156 549 -176 883 l-7 112 2208 0 2207 0 -5 473 c-5 457 -9 528 -42 762 -78 546 -261 1019 -536 1385 -383 509 -896 796 -1584 885 -146 19 -523 27 -660 14z m612 -873 c386 -81 671 -277 887 -609 174 -266 275 -625 293 -1033 l6 -144 -1685 0 -1685 0 4 28 c76 477 240 859 507 1180 245 295 590 508 931 577 148 29 209 34 415 30 171 -3 225 -8 327 -29z" />
                  <path d="M14313 14133 c2 -10 548 -1406 1212 -3103 665 -1697 1210 -3094 1213 -3106 5 -27 -485 -1190 -579 -1374 -194 -378 -447 -604 -777 -692 -55 -14 -121 -22 -232 -25 -176 -6 -329 14 -514 68 -56 16 -104 29 -108 29 -5 0 -8 -202 -8 -448 l0 -449 98 -21 c188 -42 241 -47 517 -47 242 0 282 2 383 23 549 111 995 447 1375 1034 131 203 272 469 375 713 37 89 2876 7244 2932 7390 l10 25 -522 -2 -521 -3 -888 -2410 c-488 -1325 -900 -2453 -914 -2505 -15 -52 -42 -153 -60 -225 -28 -108 -36 -130 -52 -130 -15 0 -23 20 -46 110 -15 61 -43 164 -62 230 -23 84 -1456 4177 -1717 4908 l-10 27 -555 0 c-524 0 -555 -1 -550 -17z" />
                </g>
              </svg>
            </div>
          </Face>

          {/* TOP long edge — split + round confirm button on aluminum half */}
          <Face w={L} h={D} transform={`rotateX(90deg) translateZ(${W / 2}px)`}>
            <SplitEdgeV glossFront={glossFront} matteBack={matteBack} />
            {/* Round silver confirm button */}
            <div
              style={{
                position: "absolute",
                left: "8%",
                top: `${SHELL_BLACK * 100 + (1 - SHELL_BLACK) * 50}%`,
                transform: "translateY(-50%)",
                width: 18,
                height: 18,
                borderRadius: "50%",
                background:
                  "radial-gradient(circle at 35% 30%, #e8e8ec 0%, #b8b8c0 40%, #888890 75%, #5a5a62 100%)",
                boxShadow:
                  "0 1px 2px rgba(0,0,0,0.55), inset 0 1px 1px rgba(255,255,255,0.4), inset 0 -1px 1px rgba(0,0,0,0.3)",
              }}
            />
          </Face>

          {/* BOTTOM long edge — split + Micro USB port */}
          <Face w={L} h={D} transform={`rotateX(-90deg) translateZ(${W / 2}px)`}>
            <SplitEdgeV flip glossFront={glossFront} matteBack={matteBack} />
            {/* Micro USB port */}
            <div
              style={{
                position: "absolute",
                right: "6%",
                bottom: `${SHELL_BLACK * 100 + (1 - SHELL_BLACK) * 50}%`,
                transform: "translateY(50%)",
                width: 28,
                height: 9,
                background: "linear-gradient(180deg, #000 0%, #0a0a0c 100%)",
                borderRadius: 1.5,
                boxShadow:
                  "inset 0 1px 2px rgba(0,0,0,0.95), inset 0 -0.5px 0 rgba(255,255,255,0.08), 0 0 0 0.5px rgba(255,255,255,0.12)",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: "10%",
                  right: "10%",
                  top: "50%",
                  height: 1.5,
                  marginTop: -0.75,
                  background: "rgba(180,170,140,0.35)",
                  borderRadius: 0.5,
                }}
              />
            </div>
          </Face>

          {/* LEFT short edge */}
          <Face w={D} h={W} transform={`rotateY(-90deg) translateZ(${L / 2}px)`}>
            <SplitEdgeH flip glossFront={glossFront} matteBack={matteBack} />
          </Face>

          {/* RIGHT short edge */}
          <Face w={D} h={W} transform={`rotateY(90deg) translateZ(${L / 2}px)`}>
            <SplitEdgeH glossFront={glossFront} matteBack={matteBack} />
          </Face>
        </div>
      </div>

      <style>{`@keyframes kkSpin360 { from { transform: rotateY(0deg); } to { transform: rotateY(360deg); } }`}</style>
    </div>
  );
}
