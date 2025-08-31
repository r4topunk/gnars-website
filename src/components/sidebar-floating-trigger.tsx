"use client";

import * as React from "react";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";

export default function SidebarFloatingTrigger() {
  const { state, isMobile, openMobile } = useSidebar();

  const shouldShow = isMobile ? !openMobile : state === "collapsed";
  if (!shouldShow) return null;

  return (
    <div className="fixed left-2 top-4 z-50 md:left-2 md:top-2">
      <SidebarTrigger
        aria-label="Open sidebar"
        className="cursor-pointer size-9 rounded-lg bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/30"
      />
    </div>
  );
}


