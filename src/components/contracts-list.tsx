"use client";

import { useTranslations } from "next-intl";
import { AddressDisplay } from "@/components/ui/address-display";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DAO_ADDRESSES } from "@/lib/config";

const contracts = [
  { name: "Token (NFT)", address: DAO_ADDRESSES.token, description: "Gnars NFT contract" },
  {
    name: "$GNARS (ERC20)",
    address: DAO_ADDRESSES.gnarsErc20,
    description: "$GNARS ERC20 token contract",
  },
  { name: "Auction", address: DAO_ADDRESSES.auction, description: "Auction house contract" },
  { name: "Governor", address: DAO_ADDRESSES.governor, description: "Governance contract" },
  { name: "Treasury", address: DAO_ADDRESSES.treasury, description: "Treasury contract" },
  { name: "Metadata", address: DAO_ADDRESSES.metadata, description: "Metadata contract" },
];

export function ContractsList() {
  const t = useTranslations("common");
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("contracts.title")}</CardTitle>
        <CardDescription>{t("contracts.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("contracts.columnContract")}</TableHead>
              <TableHead>{t("contracts.columnAddress")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contracts.map((contract) => (
              <TableRow key={contract.name}>
                <TableCell>
                  <div>
                    <div className="font-medium">{contract.name}</div>
                    <div className="text-sm text-muted-foreground">{contract.description}</div>
                  </div>
                </TableCell>
                <TableCell className="font-mono text-sm">
                  <AddressDisplay
                    address={contract.address}
                    variant="default"
                    showAvatar={false}
                    showCopy={true}
                    showExplorer={true}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
