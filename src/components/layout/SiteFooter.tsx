"use client";

import { usePathname } from "next/navigation";
import { HomeFooter } from "@/components/home/HomeFooter";
import { NogglesCopyFooter } from "@/components/home/NogglesCopyFooter";

export function SiteFooter() {
  const pathname = usePathname();
  return pathname === "/" ? <HomeFooter /> : <NogglesCopyFooter />;
}
