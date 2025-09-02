"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AddressDisplay } from "@/components/ui/address-display";

interface MemberDelegatorsTableProps {
  delegators: string[];
}

export function MemberDelegatorsTable({ delegators }: MemberDelegatorsTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Delegators</CardTitle>
      </CardHeader>
      <CardContent>
        {delegators.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No one delegated to this member.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Address/ENS</TableHead>
                <TableHead className="text-right">Gnars Delegated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {delegators.map((addr) => (
                <TableRow key={addr}>
                  <TableCell>
                    <AddressDisplay
                      address={addr}
                      variant="compact"
                      showAvatar
                      showENS
                      showCopy={false}
                      showExplorer={false}
                      avatarSize="sm"
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    {/* In a future refinement, we can map counts from delsWithCounts by address */}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}


