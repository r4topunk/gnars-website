"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { GNARS_ADDRESSES } from "@/lib/config";
import { AddressDisplay } from "@/components/ui/address-display";

const contracts = [
  { name: "Token (NFT)", address: GNARS_ADDRESSES.token, description: "Gnars NFT contract" },
  { name: "Auction", address: GNARS_ADDRESSES.auction, description: "Auction house contract" },
  { name: "Governor", address: GNARS_ADDRESSES.governor, description: "Governance contract" },
  { name: "Treasury", address: GNARS_ADDRESSES.treasury, description: "Treasury contract" },
  { name: "Metadata", address: GNARS_ADDRESSES.metadata, description: "Metadata contract" },
];

export function ContractsList() {
  

  return (
    <Card>
      <CardHeader>
        <CardTitle>Smart Contracts</CardTitle>
        <CardDescription>Core Gnars DAO contracts deployed on Base network</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Contract</TableHead>
              <TableHead>Address</TableHead>
              <TableHead className="w-[100px]">Action</TableHead>
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
                <TableCell />
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
