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
import { CHAIN, GNARS_ADDRESSES } from "@/lib/config"
import { getProposals, type Proposal as SdkProposal } from "@buildeross/sdk"

interface Proposal {
  proposalId: string
  proposalNumber: number
  title: string
  state: "PENDING" | "ACTIVE" | "DEFEATED" | "SUCCEEDED" | "QUEUED" | "EXECUTED" | "CANCELED" | "VETOED" | "EXPIRED"
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
    case "EXPIRED":
      return "outline" // gray
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
    case "EXPIRED":
      return "Expired"
    default:
      return state
  }
}

export function ProposalList() {
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchProposals = async () => {
      try {
        const { proposals: sdkProposals } = await getProposals(
          CHAIN.id,
          GNARS_ADDRESSES.token,
          100
        )

        const mapped: Proposal[] = (sdkProposals as SdkProposal[] | undefined ?? []).map((p) => ({
          proposalId: String(p.proposalId),
          proposalNumber: Number(p.proposalNumber),
          title: p.title ?? "",
          state: (() => {
            const s = p.state as unknown
            if (typeof s === 'number') {
              switch (s) {
                case 0: return 'PENDING'
                case 1: return 'ACTIVE'
                case 2: return 'CANCELED'
                case 3: return 'DEFEATED'
                case 4: return 'SUCCEEDED'
                case 5: return 'QUEUED'
                case 6: return 'EXPIRED'
                case 7: return 'EXECUTED'
                case 8: return 'VETOED'
                default: return 'PENDING'
              }
            }
            const up = String(s).toUpperCase()
            return up as Proposal["state"]
          })(),
          proposer: p.proposer,
          description: p.description ?? "",
          createdAt: Number(p.timeCreated ?? 0) * 1000,
          endBlock: Number(p.voteEnd ?? 0),
          forVotes: String(p.forVotes ?? "0"),
          againstVotes: String(p.againstVotes ?? "0"),
          abstainVotes: String(p.abstainVotes ?? "0"),
          quorumVotes: String(p.quorumVotes ?? "0"),
        }))

        setProposals(mapped)
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