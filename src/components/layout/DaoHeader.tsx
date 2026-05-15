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
import { useTranslations } from "next-intl";
import Image from "next/image";
import {
  ArrowLeftRight,
  BookOpen,
  Coins,
  Gavel,
  Gift,
  Home,
  Map,
  Menu,
  Newspaper,
  PlusCircle,
  Tv,
  UserCheck,
  Users,
  Video,
  Vote,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { base as thirdwebBase } from "thirdweb/chains";
import { useActiveWallet, useActiveWalletChain } from "thirdweb/react";
import { base } from "wagmi/chains";
import { DelegationModal } from "@/components/layout/DelegationModal";
import { LocaleSwitcher } from "@/components/layout/LocaleSwitcher";
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
import { useUserAddress } from "@/hooks/use-user-address";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type NavTranslations = ReturnType<typeof useTranslations<"nav">>;

// Navigation structure — built as a function so titles/descriptions come from t()
function buildNavigationItems(t: NavTranslations) {
  return [
    {
      title: t("items.tv"),
      href: "/tv",
      icon: Tv,
    },
    {
      title: t("items.dashboard"),
      href: "/",
      icon: Home,
    },
    {
      title: t("items.governance.label"),
      items: [
        {
          title: t("items.governance.proposals.title"),
          href: "/proposals",
          icon: Vote,
          description: t("items.governance.proposals.description"),
        },
        {
          title: t("items.governance.delegation.title"),
          href: "#delegation",
          icon: UserCheck,
          description: t("items.governance.delegation.description"),
        },
        {
          title: t("items.governance.createProposal.title"),
          href: "/propose",
          icon: PlusCircle,
          description: t("items.governance.createProposal.description"),
        },
        {
          title: t("items.governance.auctions.title"),
          href: "/auctions",
          icon: Gavel,
          description: t("items.governance.auctions.description"),
        },
      ],
    },
    {
      title: t("items.money.label"),
      items: [
        {
          title: t("items.money.treasury.title"),
          href: "/treasury",
          icon: Wallet,
          description: t("items.money.treasury.description"),
        },
        {
          title: t("items.money.bounties.title"),
          href: "/community/bounties",
          icon: Gift,
          description: t("items.money.bounties.description"),
          badge: "NEW!",
        },
        {
          title: t("items.money.swap.title"),
          href: "/swap",
          icon: ArrowLeftRight,
          description: t("items.money.swap.description"),
          badge: "NEW!",
        },
      ],
    },
    {
      title: t("items.community.label"),
      items: [
        {
          title: t("items.community.members.title"),
          href: "/members",
          icon: Users,
          description: t("items.community.members.description"),
        },
        {
          title: t("items.community.nogglesRails.title"),
          href: "/nogglesrails",
          icon: Map,
          description: t("items.community.nogglesRails.description"),
          badge: "NEW!",
        },
        {
          title: t("items.community.blogs.title"),
          href: "/blogs",
          icon: BookOpen,
          description: t("items.community.blogs.description"),
        },
        {
          title: t("items.community.propdates.title"),
          href: "/propdates",
          icon: Newspaper,
          description: t("items.community.propdates.description"),
        },
        {
          title: t("items.community.droposals.title"),
          href: "/droposals",
          icon: Video,
          description: t("items.community.droposals.description"),
          badge: "NEW!",
        },
        {
          title: t("items.community.createCoin.title"),
          href: "/create-coin",
          icon: Coins,
          description: t("items.community.createCoin.description"),
          badge: "NEW!",
        },
      ],
    },
  ] as const;
}

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
      <div className="hidden md:flex flex-col gap-0.5 leading-none">
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
  const t = useTranslations("nav");
  const pathname = usePathname();
  const [delegationModalOpen, setDelegationModalOpen] = React.useState(false);
  const navigationItems = buildNavigationItems(t);

  const isRouteActive = React.useCallback(
    (url: string) => {
      if (!pathname) return false;
      if (url === "/") return pathname === "/";
      return pathname === url || pathname.startsWith(`${url}/`);
    },
    [pathname],
  );

  return (
    <>
      <DelegationModal open={delegationModalOpen} onOpenChange={setDelegationModalOpen} />
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
                  className={cn(
                    "items" in item &&
                      item.items?.[0]?.href &&
                      isRouteActive(item.items[0].href) &&
                      "bg-accent/50",
                  )}
                >
                  {item.title}
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="grid w-[400px] gap-2 p-2">
                    {"items" in item &&
                      item.items?.map((subItem) => {
                        if (!subItem.icon) return null;

                        const SubIcon = subItem.icon;
                        const isDelegation = subItem.href === "#delegation";

                        if (isDelegation) {
                          return (
                            <li key={subItem.title}>
                              <NavigationMenuLink asChild>
                                <button
                                  onClick={() => setDelegationModalOpen(true)}
                                  className="flex items-start gap-3 rounded-md p-3 hover:bg-accent transition-colors w-full text-left"
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
                                </button>
                              </NavigationMenuLink>
                            </li>
                          );
                        }

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
                                  <div className="flex items-center gap-2 text-sm font-medium leading-none">
                                    {subItem.title}
                                    {"badge" in subItem && subItem.badge && (
                                      <Badge
                                        variant="secondary"
                                        className={`h-4 px-1.5 text-[10px] ${
                                          (subItem.badge as string) === "BETA"
                                            ? "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200"
                                            : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200"
                                        }`}
                                      >
                                        {subItem.badge as string}
                                      </Badge>
                                    )}
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
    </>
  );
}

function MobileNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const [delegationModalOpen, setDelegationModalOpen] = React.useState(false);
  const { isConnected } = useUserAddress();
  const activeChain = useActiveWalletChain();
  const activeWallet = useActiveWallet();
  const [isPending, setIsPending] = React.useState(false);
  const isWrongNetwork = isConnected && activeChain?.id !== base.id;
  const navigationItems = buildNavigationItems(t);

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

  const handleSwitchNetwork = React.useCallback(async () => {
    if (isPending) return;
    if (!activeWallet) return;
    setIsPending(true);
    try {
      await activeWallet.switchChain(thirdwebBase);
      toast.success(t("switchNetwork.label"));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error(`Failed to switch network: ${message}`);
    } finally {
      setIsPending(false);
    }
  }, [activeWallet, isPending, t]);

  return (
    <>
      <DelegationModal open={delegationModalOpen} onOpenChange={setDelegationModalOpen} />
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="size-5" />
            <span className="sr-only">{t("mobileMenu.toggleLabel")}</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[300px] sm:w-[400px]">
          <SheetHeader>
            <SheetTitle className="text-left">{t("mobileMenu.sheetTitle")}</SheetTitle>
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
                  {"items" in item &&
                    item.items?.map((subItem) => {
                      if (!subItem.icon) return null;

                      const SubIcon = subItem.icon;
                      const isDelegation = subItem.href === "#delegation";

                      if (isDelegation) {
                        return (
                          <button
                            key={subItem.title}
                            onClick={() => {
                              setOpen(false);
                              setDelegationModalOpen(true);
                            }}
                            className="flex items-center gap-3 rounded-md p-3 pl-6 text-sm transition-colors hover:bg-accent w-full text-left"
                          >
                            <SubIcon className="size-4" />
                            {subItem.title}
                          </button>
                        );
                      }

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
                          <span className="flex-1">{subItem.title}</span>
                          {"badge" in subItem && subItem.badge && (
                            <Badge
                              variant="secondary"
                              className={`h-4 px-1.5 text-[10px] ${
                                (subItem.badge as string) === "BETA"
                                  ? "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200"
                                  : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200"
                              }`}
                            >
                              {subItem.badge as string}
                            </Badge>
                          )}
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
                {isPending ? t("switchNetwork.switching") : t("switchNetwork.label")}
              </Badge>
            )}
            <div className="flex items-center justify-between w-full">
              <LocaleSwitcher />
              <ConnectButton />
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}

function HeaderActions() {
  const t = useTranslations("nav");
  const { isConnected } = useUserAddress();
  const activeChain = useActiveWalletChain();
  const activeWallet = useActiveWallet();
  const [isPending, setIsPending] = React.useState(false);
  const isWrongNetwork = isConnected && activeChain?.id !== base.id;

  const handleSwitchNetwork = React.useCallback(async () => {
    if (isPending) return;
    if (!activeWallet) return;
    setIsPending(true);
    try {
      await activeWallet.switchChain(thirdwebBase);
      toast.success(t("switchNetwork.label"));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error(`Failed to switch network: ${message}`);
    } finally {
      setIsPending(false);
    }
  }, [activeWallet, isPending, t]);

  return (
    <div className="flex items-center gap-2">
      {isWrongNetwork && (
        <Badge
          variant="secondary"
          className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200 cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors hidden sm:flex"
          onClick={handleSwitchNetwork}
        >
          {isPending ? t("switchNetwork.switching") : t("switchNetwork.label")}
        </Badge>
      )}
      <ThemeToggle />
      <LocaleSwitcher />
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
        {/* Left section: Mobile menu + Logo (desktop) */}
        <div className="flex items-center gap-4 flex-shrink-0">
          <MobileNav />
          <div className="hidden md:block">
            <DaoLogo />
          </div>
        </div>

        {/* Center section: Logo (mobile) + Desktop navigation */}
        <div className="flex-1 flex justify-center">
          <div className="md:hidden">
            <DaoLogo />
          </div>
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
