"use client";

import { useTranslations } from "next-intl";
import { AddressDisplay } from "@/components/ui/address-display";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface MemberDelegatorsTableProps {
  delegators: string[];
}

export function MemberDelegatorsTable({ delegators }: MemberDelegatorsTableProps) {
  const t = useTranslations("members");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("delegators.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        {delegators.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">{t("delegators.empty")}</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("delegators.table.addressEns")}</TableHead>
                <TableHead className="text-right">{t("delegators.table.gnarsDelegated")}</TableHead>
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
