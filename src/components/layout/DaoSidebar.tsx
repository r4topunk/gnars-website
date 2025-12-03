"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Gavel,
  Home,
  Newspaper,
  PlusCircle,
  Tv,
  Users,
  Video,
  Vote,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { useAccount, useSwitchChain } from "wagmi";
import { base } from "wagmi/chains";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Badge } from "@/components/ui/badge";
import { ConnectButton } from "@/components/ui/ConnectButton";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
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
        title: "Blogs",
        url: "/blogs",
        icon: BookOpen,
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
      {
        title: "TV",
        url: "/tv",
        icon: Tv,
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
  const { isConnected, chain } = useAccount();
  const { switchChain, isPending } = useSwitchChain();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const isRouteActive = React.useCallback(
    (url: string) => {
      if (!mounted || !pathname) return false;
      if (url === "/") return pathname === "/";
      return pathname === url || pathname.startsWith(`${url}/`);
    },
    [pathname, mounted],
  );

  const isWrongNetwork = isConnected && chain?.id !== base.id;

  const handleSwitchNetwork = React.useCallback(() => {
    if (isPending) return;

    switchChain(
      { chainId: base.id },
      {
        onSuccess: () => {
          toast.success("Successfully switched to Base");
        },
        onError: (error) => {
          toast.error(`Failed to switch network: ${error.message}`);
        },
      },
    );
  }, [switchChain, isPending]);

  return (
    <Sidebar {...props}>
      <SidebarHeader className="gap-3.5 border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <DaoHeader />
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <SidebarTrigger />
          </div>
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
                      className="touch-manipulation"
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
      <SidebarFooter className="border-t p-4">
        <div className="flex flex-col gap-2 w-full justify-center items-center">
          {isWrongNetwork && (
            <Badge
              variant="secondary"
              className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200 cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
              onClick={handleSwitchNetwork}
            >
              {isPending ? "Switching..." : "Switch to Base"}
            </Badge>
          )}
          <div className="flex items-center justify-between gap-2 w-full">
            <ConnectButton />
          </div>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
