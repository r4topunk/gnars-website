"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Gavel,
  Home,
  PlusCircle,
  Users,
  Vote,
  Wallet,
  Newspaper,
  Video,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";

// DAO navigation structure
const daoNavigation = [
  {
    title: "Overview",
    items: [
      {
        title: "Dashboard",
        url: "/",
        icon: Home,
      },
    ],
  },
  {
    title: "Governance",
    items: [
      {
        title: "Auctions",
        url: "/auctions",
        icon: Gavel,
      },
      {
        title: "Proposals",
        url: "/proposals",
        icon: Vote,
      },
      {
        title: "Create Proposal",
        url: "/propose",
        icon: PlusCircle,
      },
    ],
  },
  {
    title: "Treasury & Finance",
    items: [
      {
        title: "Treasury",
        url: "/treasury",
        icon: Wallet,
      },
    ],
  },
  {
    title: "Community",
    items: [
      {
        title: "Members",
        url: "/members",
        icon: Users,
      },
      {
        title: "Propdates",
        url: "/propdates",
        icon: Newspaper,
      },
      {
        title: "Droposals",
        url: "/droposals",
        icon: Video,
      },
    ],
  },
];

function DaoHeader() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          size="lg"
          className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
        >
          <div className="flex aspect-square size-8 items-center justify-center overflow-hidden rounded-md bg-black">
            <Image
              src="/gnars.webp"
              alt="Gnars DAO"
              width={64}
              height={64}
              className="object-cover w-4 h-4"
            />
          </div>
          <div className="flex flex-col gap-1 leading-none">
            <span className="font-semibold">Gnars DAO</span>
            <Badge
              variant="secondary"
              className="h-4 px-1.5 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200"
            >
              Base
            </Badge>
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

export function DaoSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();

  const isRouteActive = React.useCallback(
    (url: string) => {
      if (!pathname) return false;
      if (url === "/") return pathname === "/";
      return pathname === url || pathname.startsWith(`${url}/`);
    },
    [pathname],
  );

  return (
    <Sidebar {...props}>
      <SidebarHeader className="gap-3.5 border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <DaoHeader />
          </div>
          <SidebarTrigger className="ml-2" />
        </div>
      </SidebarHeader>
      <SidebarContent>
        {daoNavigation.map((section) => (
          <SidebarGroup key={section.title}>
            <SidebarGroupLabel>{section.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isRouteActive(item.url)}
                      className="min-h-[44px] touch-manipulation"
                    >
                      <Link
                        href={item.url}
                        aria-current={isRouteActive(item.url) ? "page" : undefined}
                      >
                        <item.icon />
                        {item.title}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
