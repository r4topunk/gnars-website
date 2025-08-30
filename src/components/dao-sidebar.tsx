"use client";

import * as React from "react";
import { Home, Gavel, Vote, PlusCircle, Wallet, Users, FileText, Trophy, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
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
        isActive: true,
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
        isActive: false,
      },
      {
        title: "Proposals",
        url: "/proposals",
        icon: Vote,
        isActive: false,
      },
      {
        title: "Create Proposal",
        url: "/propose",
        icon: PlusCircle,
        isActive: false,
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
        isActive: false,
      },
    ],
  },
  {
    title: "Community",
    items: [
      {
        title: "Members & Delegates",
        url: "/members",
        icon: Users,
        isActive: false,
      },
      {
        title: "Propdates",
        url: "/propdates",
        icon: FileText,
        isActive: false,
      },
    ],
  },
];

function SearchForm() {
  return (
    <form>
      <SidebarGroup className="py-0">
        <SidebarGroupContent className="relative">
          <Label htmlFor="search" className="sr-only">
            Search DAO
          </Label>
          <SidebarInput
            id="search"
            placeholder="Search proposals, members..."
            className="pl-8"
          />
          <Search className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 select-none opacity-50" />
        </SidebarGroupContent>
      </SidebarGroup>
    </form>
  );
}

function DaoHeader() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          size="lg"
          className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
        >
          <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <Trophy className="size-4" />
          </div>
          <div className="flex flex-col gap-0.5 leading-none">
            <span className="font-semibold">Gnars DAO</span>
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">on</span>
              <Badge variant="secondary" className="h-4 px-1.5 text-xs">
                Base
              </Badge>
            </div>
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

export function DaoSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar {...props}>
      <SidebarHeader className="gap-3.5 border-b p-4">
        <DaoHeader />
        <SearchForm />
      </SidebarHeader>
      <SidebarContent>
        {daoNavigation.map((section) => (
          <SidebarGroup key={section.title}>
            <SidebarGroupLabel>{section.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={item.isActive} className="min-h-[44px] touch-manipulation">
                      <a href={item.url}>
                        <item.icon />
                        {item.title}
                      </a>
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