import { getTranslations } from "next-intl/server";
import { SwapChainProvider } from "@/app/[locale]/swap/SwapChainContext";
import { SwapWidget } from "@/app/[locale]/swap/SwapWidget";
import { Eyebrow, SHELL } from "./primitives";

/**
 * The live /swap widget, dropped beside the argument for why the fee exists.
 * It ships its own chain context, so the only thing this section adds is the
 * editorial column and the three-number loop.
 */
export async function SwapSection() {
  const t = await getTranslations("newhome.swap");

  const loop = [
    { value: "0.5%", label: t("loop.swap") },
    { value: "25%", label: t("loop.yield") },
    { value: "100%", label: t("loop.auction") },
  ];

  return (
    <section id="swap" className="px-4 py-10 sm:px-6 sm:py-18">
      <div
        className={`${SHELL} grid grid-cols-1 items-center gap-11 px-0 lg:grid-cols-[1fr_440px]`}
      >
        <div className="flex flex-col gap-4.5">
          <Eyebrow>{t("eyebrow")}</Eyebrow>
          <h2 className="text-[clamp(1.875rem,3.4vw,2.75rem)] font-extrabold leading-[1.05] tracking-[-0.025em] text-neutral-50">
            {t("title")}
          </h2>
          <p className="max-w-[36em] text-pretty text-[15.5px] leading-[1.6] text-neutral-400">
            {t("body")}
          </p>
          <div className="grid max-w-[520px] grid-cols-1 gap-2.5 sm:grid-cols-3">
            {loop.map((m) => (
              <div
                key={m.label}
                className="rounded-xl border border-white/10 bg-neutral-900 px-4 py-3.5"
              >
                <div className="font-mono text-[19px] font-bold text-[#4ade80]">{m.value}</div>
                <div className="mt-0.5 text-xs leading-[1.4] text-neutral-400">{m.label}</div>
              </div>
            ))}
          </div>
        </div>

        <SwapChainProvider>
          <SwapWidget />
        </SwapChainProvider>
      </div>
    </section>
  );
}
