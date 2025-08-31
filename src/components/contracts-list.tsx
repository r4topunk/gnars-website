"use client";

import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
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

const contracts = [
  { name: "Token (NFT)", address: GNARS_ADDRESSES.token, description: "Gnars NFT contract" },
  { name: "Auction", address: GNARS_ADDRESSES.auction, description: "Auction house contract" },
  { name: "Governor", address: GNARS_ADDRESSES.governor, description: "Governance contract" },
  { name: "Treasury", address: GNARS_ADDRESSES.treasury, description: "Treasury contract" },
  { name: "Metadata", address: GNARS_ADDRESSES.metadata, description: "Metadata contract" },
];

export function ContractsList() {
  const copyToClipboard = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
    } catch {
      // Fallback for browsers that don't support navigator.clipboard
      const textArea = document.createElement("textarea");
      textArea.value = address;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
    }
  };

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

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
                  <span className="hidden md:inline">{contract.address}</span>
                  <span className="md:hidden">{truncateAddress(contract.address)}</span>
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(contract.address)}
                    className="h-8 w-8 p-0"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
