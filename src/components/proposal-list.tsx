"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

// Mock proposal data structure - in real implementation, this would come from Builder SDK
interface Proposal {
  proposalId: string
  proposalNumber: number
  title: string
  state: "PENDING" | "ACTIVE" | "DEFEATED" | "SUCCEEDED" | "QUEUED" | "EXECUTED" | "CANCELED" | "VETOED"
  proposer: string
  description: string
  createdAt: number
  endBlock: number
  forVotes: string
  againstVotes: string
  abstainVotes: string
  quorumVotes: string
}

const getStatusBadgeVariant = (state: Proposal["state"]) => {
  switch (state) {
    case "EXECUTED":
      return "default" // green
    case "ACTIVE":
      return "secondary" // blue
    case "DEFEATED":
    case "VETOED":
      return "destructive" // red
    case "CANCELED":
      return "outline" // gray
    default:
      return "secondary"
  }
}

const getStatusLabel = (state: Proposal["state"]) => {
  switch (state) {
    case "PENDING":
      return "Pending"
    case "ACTIVE":
      return "Active"
    case "DEFEATED":
      return "Defeated"
    case "SUCCEEDED":
      return "Succeeded"
    case "QUEUED":
      return "Queued"
    case "EXECUTED":
      return "Executed"
    case "CANCELED":
      return "Canceled"
    case "VETOED":
      return "Vetoed"
    default:
      return state
  }
}

export function ProposalList() {
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Mock data - replace with actual Builder SDK call
    const fetchProposals = async () => {
      try {
        // In real implementation, use something like:
        // const data = await getProposals(CHAIN.id, GNARS_ADDRESSES.token)
        
        // Mock data for now
        const mockProposals: Proposal[] = [
          {
            proposalId: "0x1",
            proposalNumber: 3,
            title: "Fund Gnars Skateboarding Event",
            state: "EXECUTED",
            proposer: "0x123...abc",
            description: "Proposal to fund a skateboarding event...",
            createdAt: Date.now() - 86400000 * 7,
            endBlock: 123456789,
            forVotes: "15.5",
            againstVotes: "2.1",
            abstainVotes: "0.5",
            quorumVotes: "10"
          },
          {
            proposalId: "0x2",
            proposalNumber: 2,
            title: "Update DAO Metadata",
            state: "ACTIVE",
            proposer: "0x456...def",
            description: "Update the DAO description and metadata...",
            createdAt: Date.now() - 86400000 * 2,
            endBlock: 123456999,
            forVotes: "8.2",
            againstVotes: "1.5",
            abstainVotes: "0.1",
            quorumVotes: "10"
          },
          {
            proposalId: "0x3",
            proposalNumber: 1,
            title: "Treasury Diversification Strategy",
            state: "DEFEATED",
            proposer: "0x789...ghi",
            description: "Proposal to diversify treasury holdings...",
            createdAt: Date.now() - 86400000 * 14,
            endBlock: 123456700,
            forVotes: "3.2",
            againstVotes: "12.8",
            abstainVotes: "1.0",
            quorumVotes: "10"
          }
        ]
        
        setProposals(mockProposals)
      } catch (error) {
        console.error("Failed to fetch proposals:", error)
        setProposals([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchProposals()
  }, [])

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted rounded animate-pulse" />
        <div className="h-64 bg-muted rounded animate-pulse" />
      </div>
    )
  }

  if (proposals.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground text-lg">No proposals found</p>
        <p className="text-muted-foreground text-sm mt-2">
          Check back later for new governance proposals
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-20">ID</TableHead>
            <TableHead>Title</TableHead>
            <TableHead className="w-32">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {proposals.map((proposal) => (
            <TableRow key={proposal.proposalId} className="cursor-pointer hover:bg-muted/50">
              <TableCell className="font-mono">
                <Link href={`/proposals/${proposal.proposalNumber}`} className="hover:underline">
                  #{proposal.proposalNumber}
                </Link>
              </TableCell>
              <TableCell>
                <Link href={`/proposals/${proposal.proposalNumber}`} className="hover:underline">
                  <div className="font-medium">{proposal.title}</div>
                  <div className="text-sm text-muted-foreground line-clamp-1 mt-1">
                    {proposal.description}
                  </div>
                </Link>
              </TableCell>
              <TableCell>
                <Badge variant={getStatusBadgeVariant(proposal.state)}>
                  {getStatusLabel(proposal.state)}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}