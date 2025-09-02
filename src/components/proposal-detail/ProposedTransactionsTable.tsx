"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AddressDisplay } from "@/components/ui/address-display";

interface ProposedTransactionsTableProps {
  targets: string[];
  values: (string | number)[];
  signatures: string[];
}

export function ProposedTransactionsTable({ targets, values, signatures }: ProposedTransactionsTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Proposed Transactions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {targets.length === 0 ? (
          <p className="text-muted-foreground">No transaction calls attached.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Target</TableHead>
                <TableHead>Function</TableHead>
                <TableHead>Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {targets.map((target, index) => {
                const valueEth = (() => {
                  const raw = Number(values[index] || 0);
                  if (!Number.isFinite(raw)) return "0";
                  return (raw / 1e18).toLocaleString(undefined, { maximumFractionDigits: 6 });
                })();
                const fnSig = signatures[index] || "—";
                return (
                  <TableRow key={`${target}-${index}`}>
                    <TableCell>
                      <AddressDisplay address={target} variant="default" showAvatar={false} showCopy={true} showExplorer={true} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{fnSig}</Badge>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono">{valueEth} ETH</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}


