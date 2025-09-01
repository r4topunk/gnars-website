"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AddressDisplay } from "@/components/ui/address-display";
import Link from "next/link";
import { type MemberListItem } from "@/services/members";
 

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
  searchTerm: string;
}

export function MembersList({ searchTerm: initialSearchTerm = "" }: MembersListProps) {
  const [members, setMembers] = useState<MemberListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
 

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
    const searchLower = searchTerm.toLowerCase();
    let result = members.filter((member) =>
      member.owner.toLowerCase().includes(searchLower) ||
      member.delegate.toLowerCase().includes(searchLower),
    );
    return result;
  }, [members, searchTerm]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by address or ENS..." className="max-w-sm" disabled />
        </div>
        <div className="text-center py-8">
          <div className="text-muted-foreground">Loading members...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by address or ENS..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Address/ENS</TableHead>
              <TableHead>Delegate</TableHead>
              <TableHead className="text-right">Gnars Held</TableHead>
              <TableHead className="text-right">Proposals Voted</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMembers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  {searchTerm ? "No members found matching your search." : "No members found."}
                </TableCell>
              </TableRow>
            ) : (
              filteredMembers.map((member) => (
                <TableRow key={member.owner}>
                  <TableCell>
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
                    <span className="font-medium">{member.votesCount ?? 0}</span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="text-sm text-muted-foreground">
        Showing {filteredMembers.length} of {members.length} members
      </div>
    </div>
  );
}
