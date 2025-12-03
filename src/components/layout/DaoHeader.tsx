/**
 * DaoHeader - Sticky horizontal navigation header
 *
 * Main navigation component that replaces the sidebar with a top sticky menu.
 * Features desktop dropdown navigation and mobile sheet menu.
 *
 * Public surface:
 * - Responsive navigation (desktop dropdowns, mobile sheet)
 * - Active route highlighting
 * - Wallet connection integration
 * - Theme toggle
 * - Network switching (Base chain)
 *
 * Accessibility:
 * - Keyboard navigation support via NavigationMenu
 * - ARIA labels for mobile menu
 * - Focus management
 */

"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Coins,
  Gavel,
  Home,
  Menu,
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
import { Button } from "@/components/ui/button";
import { ConnectButton } from "@/components/ui/ConnectButton";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

// Navigation structure
const navigationItems = [
  {
    title: "Dashboard",
    href: "/",
    icon: Home,
  },
  {
    title: "Governance",
    items: [
      {
        title: "Auctions",
        href: "/auctions",
        icon: Gavel,
        description: "Bid on Gnars NFTs in active auctions",
      },
      {
        title: "Proposals",
        href: "/proposals",
        icon: Vote,
        description: "View and vote on DAO proposals",
      },
      {
        title: "Create Proposal",
        href: "/propose",
        icon: PlusCircle,
        description: "Submit a new proposal to the DAO",
      },
    ],
  },
  {
    title: "Treasury",
    href: "/treasury",
    icon: Wallet,
  },
  {
    title: "Community",
    items: [
      {
        title: "Members",
        href: "/members",
        icon: Users,
        description: "Browse all DAO members and holders",
      },
      {
        title: "Blogs",
        href: "/blogs",
        icon: BookOpen,
        description: "Read community blog posts and updates",
      },
      {
        title: "Propdates",
        href: "/propdates",
        icon: Newspaper,
        description: "Follow proposal progress updates",
      },
      {
        title: "Droposals",
        href: "/droposals",
        icon: Video,
        description: "Video proposals from the community",
      },
      {
        title: "TV",
        href: "/tv",
        icon: Tv,
        description: "Watch creator coins feed",
      },
      {
        title: "Create Coin",
        href: "/create-coin",
        icon: Coins,
        description: "Create a new coin on Zora",
      },
    ],
  },
];

function DaoLogo() {
  return (
    <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
      <div className="flex aspect-square size-8 items-center justify-center overflow-hidden rounded-md bg-black">
        <Image
          src="/gnars.webp"
          alt="Gnars DAO"
          width={64}
          height={64}
          className="object-cover w-4 h-4"
        />
      </div>
      <div className="flex flex-col gap-0.5 leading-none">
        <span className="font-semibold text-sm">Gnars DAO</span>
        <Badge
          variant="secondary"
          className="h-4 px-1.5 text-[10px] bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200"
        >
          Base
        </Badge>
      </div>
    </Link>
  );
}

function DesktopNav() {
  const pathname = usePathname();
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

  return (
    <NavigationMenu className="hidden md:flex">
      <NavigationMenuList className="items-center">
        {navigationItems.map((item) => {
          // Single link item
          if ("href" in item && item.href) {
            return (
              <NavigationMenuItem key={item.title}>
                <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                  <Link
                    href={item.href}
                    className={cn(isRouteActive(item.href) && "bg-accent text-accent-foreground")}
                  >
                    {item.title}
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
            );
          }

          // Dropdown item
          return (
            <NavigationMenuItem key={item.title}>
              <NavigationMenuTrigger
                className={cn(isRouteActive(item.items?.[0]?.href || "") && "bg-accent/50")}
              >
                {item.title}
              </NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="grid w-[400px] gap-2 p-2">
                  {item.items?.map((subItem) => {
                    const SubIcon = subItem.icon;

                    return (
                      <li key={subItem.title}>
                        <NavigationMenuLink asChild>
                          <Link
                            href={subItem.href!}
                            className={cn(
                              "flex items-start gap-3 rounded-md p-3 hover:bg-accent transition-colors",
                              isRouteActive(subItem.href!) && "bg-accent/50",
                            )}
                          >
                            <SubIcon className="size-5 mt-0.5 text-muted-foreground" />
                            <div className="flex flex-col gap-1">
                              <div className="text-sm font-medium leading-none">
                                {subItem.title}
                              </div>
                              <p className="text-sm text-muted-foreground line-clamp-2 leading-snug">
                                {subItem.description}
                              </p>
                            </div>
                          </Link>
                        </NavigationMenuLink>
                      </li>
                    );
                  })}
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>
          );
        })}
      </NavigationMenuList>
    </NavigationMenu>
  );
}

function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const { isConnected, chain } = useAccount();
  const { switchChain, isPending } = useSwitchChain();
  const isWrongNetwork = isConnected && chain?.id !== base.id;

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
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="size-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] sm:w-[400px]">
        <SheetHeader>
          <SheetTitle className="text-left">Navigation</SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-4 mt-8 flex-1 overflow-y-auto">
          {navigationItems.map((item) => {
            if ("href" in item && item.href) {
              const Icon = item.icon;
              return (
                <Link
                  key={item.title}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-md p-3 text-sm font-medium transition-colors hover:bg-accent",
                    isRouteActive(item.href) && "bg-accent text-accent-foreground",
                  )}
                >
                  <Icon className="size-5" />
                  {item.title}
                </Link>
              );
            }

            return (
              <div key={item.title} className="flex flex-col gap-2">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3">
                  {item.title}
                </div>
                {item.items?.map((subItem) => {
                  const SubIcon = subItem.icon;

                  return (
                    <Link
                      key={subItem.title}
                      href={subItem.href!}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-md p-3 pl-6 text-sm transition-colors hover:bg-accent",
                        isRouteActive(subItem.href!) && "bg-accent text-accent-foreground",
                      )}
                    >
                      <SubIcon className="size-4" />
                      {subItem.title}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>
        <SheetFooter className="border-t mt-4">
          {isWrongNetwork && (
            <Badge
              variant="secondary"
              className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200 cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors w-full justify-center"
              onClick={handleSwitchNetwork}
            >
              {isPending ? "Switching..." : "Switch to Base"}
            </Badge>
          )}
          <ConnectButton />
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function HeaderActions() {
  const { isConnected, chain } = useAccount();
  const { switchChain, isPending } = useSwitchChain();
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
    <div className="flex items-center gap-2">
      {isWrongNetwork && (
        <Badge
          variant="secondary"
          className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200 cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors hidden sm:flex"
          onClick={handleSwitchNetwork}
        >
          {isPending ? "Switching..." : "Switch to Base"}
        </Badge>
      )}
      <ThemeToggle />
      <div className="hidden sm:block">
        <ConnectButton />
      </div>
    </div>
  );
}

export function DaoHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center px-4 md:px-6 max-w-6xl mx-auto">
        {/* Left section: Logo + Mobile menu */}
        <div className="flex items-center gap-4 flex-shrink-0">
          <MobileNav />
          <DaoLogo />
        </div>

        {/* Center section: Desktop navigation */}
        <div className="flex-1 flex justify-center">
          <DesktopNav />
        </div>

        {/* Right section: Actions */}
        <div className="flex-shrink-0">
          <HeaderActions />
        </div>
      </div>
    </header>
  );
}
