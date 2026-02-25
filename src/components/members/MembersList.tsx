"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown, Search, UserPlus } from "lucide-react";
import { DelegationModal } from "@/components/layout/DelegationModal";
import { AddressDisplay } from "@/components/ui/address-display";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { GNARS_ADDRESSES } from "@/lib/config";
import { type MemberListItem } from "@/services/members";

function FarcasterIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect width="1000" height="1000" rx="200" fill="#7c3aed" />
      <path
        d="M257.778 155.556H742.222V844.445H671.111V528.889H328.889V844.445H257.778V155.556Z"
        fill="white"
      />
      <path d="M328.889 528.889H671.111V600H328.889V528.889Z" fill="white" />
    </svg>
  );
}

function formatFollowers(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  }
  return count.toString();
}

async function fetchMembers(search?: string): Promise<MemberListItem[]> {
  const url = new URL("/api/members", window.location.origin);
  if (search) url.searchParams.set("search", search);
  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    let msg = `Failed to fetch members: ${res.status}`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body?.error) msg = `${msg} - ${body.error}`;
    } catch {}
    throw new Error(msg);
  }
  const json = (await res.json()) as { members: MemberListItem[] };
  return json.members;
}

interface MembersListProps {
  searchTerm?: string;
  showSearch?: boolean;
}

export function MembersList({
  searchTerm: initialSearchTerm = "",
  showSearch = true,
}: MembersListProps) {
  const [members, setMembers] = useState<MemberListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [sortBy, setSortBy] = useState<"delegate" | "tokens" | "activeVotes" | "attendancePct">(
    "tokens",
  );
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const PAGE_SIZE = 100;
  const [visibleCount, setVisibleCount] = useState<number>(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [delegationModalOpen, setDelegationModalOpen] = useState(false);
  const [selectedDelegateAddress, setSelectedDelegateAddress] = useState<string | undefined>();

  useEffect(() => {
    async function loadMembers() {
      try {
        setLoading(true);
        const fetchedMembers = await fetchMembers();
        setMembers(fetchedMembers);
      } catch (error) {
        console.error("Failed to load members:", error);
      } finally {
        setLoading(false);
      }
    }

    loadMembers();
  }, []);

  const filteredMembers = useMemo(() => {
    const searchLower = deferredSearchTerm.toLowerCase();
    const result = members
      .filter(
        (member) =>
          member.owner.toLowerCase().includes(searchLower) ||
          member.delegate.toLowerCase().includes(searchLower),
      )
      .filter((m) => (m.activeVotes ?? 0) > 0);
    const dir = sortDir === "asc" ? 1 : -1;
    const compare = (a: MemberListItem, b: MemberListItem) => {
      switch (sortBy) {
        case "delegate": {
          const aSelf = a.delegate.toLowerCase() === a.owner.toLowerCase();
          const bSelf = b.delegate.toLowerCase() === b.owner.toLowerCase();
          const aKey = aSelf ? "" : a.delegate.toLowerCase();
          const bKey = bSelf ? "" : b.delegate.toLowerCase();
          return aKey.localeCompare(bKey) * dir;
        }
        case "tokens":
          return (a.tokenCount - b.tokenCount) * dir;
        case "activeVotes":
          return ((a.activeVotes ?? 0) - (b.activeVotes ?? 0)) * dir;
        case "attendancePct":
          return ((a.attendancePct ?? 0) - (b.attendancePct ?? 0)) * dir;
        default:
          return 0;
      }
    };
    return [...result].sort(compare);
  }, [members, deferredSearchTerm, sortBy, sortDir]);

  // Reset visible count when the filters change
  useEffect(() => {
    setVisibleCount((prev) =>
      Math.min(Math.max(PAGE_SIZE, prev), filteredMembers.length || PAGE_SIZE),
    );
  }, [members.length, deferredSearchTerm, sortBy, sortDir, filteredMembers.length]);

  // IntersectionObserver to load more on scroll
  useEffect(() => {
    if (!sentinelRef.current) return;
    const el = sentinelRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry?.isIntersecting) return;
        setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, filteredMembers.length));
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => {
      observer.unobserve(el);
      observer.disconnect();
    };
  }, [filteredMembers.length]);

  if (loading) {
    return (
      <div className="space-y-4">
        {showSearch ? (
          <div className="flex flex-wrap items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by address or ENS..."
              value={searchTerm}
              className="w-full sm:max-w-sm"
              disabled
            />
          </div>
        ) : null}
        <div className="text-center py-8">
          <div className="text-muted-foreground">Loading members...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showSearch ? (
        <div className="flex flex-wrap items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by address or ENS..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:max-w-sm"
          />
        </div>
      ) : null}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Address/ENS</TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => {
                  setSortBy("delegate");
                  setSortDir((d) => (sortBy === "delegate" ? (d === "asc" ? "desc" : "asc") : d));
                }}
              >
                <span className="inline-flex items-center gap-1">
                  Delegate
                  {sortBy === "delegate" ? (
                    sortDir === "asc" ? (
                      <ArrowUp className="h-3 w-3" />
                    ) : (
                      <ArrowDown className="h-3 w-3" />
                    )
                  ) : (
                    <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                  )}
                </span>
              </TableHead>
              <TableHead
                className="text-right cursor-pointer select-none"
                onClick={() => {
                  setSortBy("tokens");
                  setSortDir((d) => (sortBy === "tokens" ? (d === "asc" ? "desc" : "asc") : d));
                }}
              >
                <span className="inline-flex items-center gap-1 justify-end w-full">
                  Gnars Held
                  {sortBy === "tokens" ? (
                    sortDir === "asc" ? (
                      <ArrowUp className="h-3 w-3" />
                    ) : (
                      <ArrowDown className="h-3 w-3" />
                    )
                  ) : (
                    <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                  )}
                </span>
              </TableHead>
              <TableHead
                className="text-right cursor-pointer select-none"
                onClick={() => {
                  setSortBy("activeVotes");
                  setSortDir((d) =>
                    sortBy === "activeVotes" ? (d === "asc" ? "desc" : "asc") : d,
                  );
                }}
              >
                <span className="inline-flex items-center gap-1 justify-end w-full">
                  Active Votes
                  {sortBy === "activeVotes" ? (
                    sortDir === "asc" ? (
                      <ArrowUp className="h-3 w-3" />
                    ) : (
                      <ArrowDown className="h-3 w-3" />
                    )
                  ) : (
                    <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                  )}
                </span>
              </TableHead>
              <TableHead
                className="text-right cursor-pointer select-none"
                onClick={() => {
                  setSortBy("attendancePct");
                  setSortDir((d) =>
                    sortBy === "attendancePct" ? (d === "asc" ? "desc" : "asc") : d,
                  );
                }}
              >
                <span className="inline-flex items-center gap-1 justify-end w-full">
                  Attendance %
                  {sortBy === "attendancePct" ? (
                    sortDir === "asc" ? (
                      <ArrowUp className="h-3 w-3" />
                    ) : (
                      <ArrowDown className="h-3 w-3" />
                    )
                  ) : (
                    <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                  )}
                </span>
              </TableHead>
              <TableHead className="text-right">Social</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMembers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  {searchTerm ? "No members found matching your search." : "No members found."}
                </TableCell>
              </TableRow>
            ) : (
              filteredMembers.slice(0, visibleCount).map((member) => (
                <TableRow key={member.owner}>
                  <TableCell>
                    {member.owner.toLowerCase() === GNARS_ADDRESSES.treasury.toLowerCase() ? (
                      <Link
                        href={`/members/${member.owner}`}
                        className="hover:underline font-medium"
                      >
                        {"Gnars' treasury"}
                      </Link>
                    ) : (
                      <Link href={`/members/${member.owner}`} className="hover:underline">
                        <AddressDisplay
                          address={member.owner}
                          variant="compact"
                          showAvatar={true}
                          showENS={true}
                          showCopy={false}
                          showExplorer={false}
                          avatarSize="sm"
                          onAddressClick={() => {}}
                        />
                      </Link>
                    )}
                  </TableCell>
                  <TableCell>
                    {member.delegate.toLowerCase() === member.owner.toLowerCase() ? (
                      <span className="text-muted-foreground">-</span>
                    ) : (
                      <Link href={`/members/${member.delegate}`} className="hover:underline">
                        <AddressDisplay
                          address={member.delegate}
                          variant="compact"
                          showAvatar={false}
                          showENS={true}
                          showCopy={false}
                          showExplorer={false}
                          avatarSize="sm"
                          onAddressClick={() => {}}
                        />
                      </Link>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-col items-end gap-1">
                      <span className="font-medium">{member.tokenCount}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="font-medium">{member.activeVotes ?? 0}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="font-medium">{member.attendancePct ?? 0}%</span>
                  </TableCell>
                  <TableCell className="text-right">
                    {member.farcaster ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex items-center gap-1 cursor-default">
                            <FarcasterIcon className="h-3.5 w-3.5" />
                            <span className="text-sm font-medium">
                              {formatFollowers(member.farcaster.followerCount)}
                            </span>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          @{member.farcaster.username} · {member.farcaster.followerCount.toLocaleString()} followers on Farcaster
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedDelegateAddress(member.owner);
                        setDelegationModalOpen(true);
                      }}
                      className="gap-1"
                    >
                      <UserPlus className="h-3 w-3" />
                      Delegate
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Sentinel for infinite scroll */}
      <div ref={sentinelRef} className="h-10" />

      <div className="text-sm text-muted-foreground">
        Showing {Math.min(visibleCount, filteredMembers.length)} of {filteredMembers.length} members
      </div>

      <DelegationModal
        open={delegationModalOpen}
        onOpenChange={setDelegationModalOpen}
        initialDelegateAddress={selectedDelegateAddress}
      />
    </div>
  );
}
