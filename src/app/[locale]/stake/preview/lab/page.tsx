import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { RiderSelectLab } from "@/components/stake/preview/lab/RiderSelectLab";

// Design lab for the rider-select element: four alternative layouts of the same
// component, stacked for side-by-side judgement. Internal review surface only —
// linked from nowhere, noindex, English chrome (like PreviewToolbar).
export const metadata: Metadata = {
  title: "Rider select: design lab",
  robots: { index: false, follow: false },
};

export default async function RiderSelectLabPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="py-10">
      <div className="mx-auto max-w-6xl">
        <RiderSelectLab />
      </div>
    </div>
  );
}
