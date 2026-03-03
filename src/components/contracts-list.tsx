"use client";

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
import { GNARS_ADDRESSES } from "@/lib/config";
import { DAO_CONFIG } from "@/lib/dao-config";

const contracts = [
  {
    name: DAO_CONFIG.contractDescriptions.token.name,
    address: GNARS_ADDRESSES.token,
    description: DAO_CONFIG.contractDescriptions.token.description,
  },
  {
    name: DAO_CONFIG.contractDescriptions.gnarsErc20.name,
    address: GNARS_ADDRESSES.gnarsErc20,
    description: DAO_CONFIG.contractDescriptions.gnarsErc20.description,
  },
  {
    name: DAO_CONFIG.contractDescriptions.auction.name,
    address: GNARS_ADDRESSES.auction,
    description: DAO_CONFIG.contractDescriptions.auction.description,
  },
  {
    name: DAO_CONFIG.contractDescriptions.governor.name,
    address: GNARS_ADDRESSES.governor,
    description: DAO_CONFIG.contractDescriptions.governor.description,
  },
  {
    name: DAO_CONFIG.contractDescriptions.treasury.name,
    address: GNARS_ADDRESSES.treasury,
    description: DAO_CONFIG.contractDescriptions.treasury.description,
  },
  {
    name: DAO_CONFIG.contractDescriptions.metadata.name,
    address: GNARS_ADDRESSES.metadata,
    description: DAO_CONFIG.contractDescriptions.metadata.description,
  },
];

export function ContractsList() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Smart Contracts</CardTitle>
        <CardDescription>
          Core {DAO_CONFIG.name} DAO contracts deployed on Base network
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Contract</TableHead>
              <TableHead>Address</TableHead>
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
