'use client'

import { useState, useEffect } from 'react'
import { CircleUserRound, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

// Mock data structure - in real implementation, this would come from the Builder SDK
interface DaoMember {
  ownerAlias: string
  owner: string
  delegate: string
  tokens: number[]
  tokenCount: number
  timeJoined: number
}

// Mock function to simulate fetching members from Builder SDK
async function fetchDaoMembers(): Promise<DaoMember[]> {
  // In real implementation, this would use:
  // import { memberSnapshotRequest } from '@buildeross/sdk'
  // return memberSnapshotRequest(CHAIN.id, GNARS_ADDRESSES.token)
  
  // Mock data for demonstration
  return [
    {
      ownerAlias: '0x1234567890abcdef1234567890abcdef12345678',
      owner: '0x1234567890abcdef1234567890abcdef12345678',
      delegate: '0x1234567890abcdef1234567890abcdef12345678',
      tokens: [1, 15, 27],
      tokenCount: 3,
      timeJoined: Date.now() - 86400000 * 30, // 30 days ago
    },
    {
      ownerAlias: '0x9876543210fedcba9876543210fedcba98765432',
      owner: '0x9876543210fedcba9876543210fedcba98765432',
      delegate: '0x5555555555555555555555555555555555555555',
      tokens: [5, 22],
      tokenCount: 2,
      timeJoined: Date.now() - 86400000 * 60, // 60 days ago
    },
    {
      ownerAlias: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      owner: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      delegate: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      tokens: [8],
      tokenCount: 1,
      timeJoined: Date.now() - 86400000 * 15, // 15 days ago
    },
  ]
}

// Function to resolve ENS names (mock implementation)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function resolveENS(_address: string): Promise<string | null> {
  // In real implementation, this would use a proper ENS resolver
  // For now, return null to show raw addresses
  return null
}

interface MembersListProps {
  searchTerm: string
}

export function MembersList({ searchTerm: initialSearchTerm = '' }: MembersListProps) {
  const [members, setMembers] = useState<DaoMember[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm)
  const [ensNames, setEnsNames] = useState<Record<string, string>>({})

  useEffect(() => {
    async function loadMembers() {
      try {
        setLoading(true)
        const fetchedMembers = await fetchDaoMembers()
        setMembers(fetchedMembers)

        // Resolve ENS names for each member
        const ensPromises = fetchedMembers.map(async (member) => {
          const ensName = await resolveENS(member.owner)
          return { address: member.owner, ensName }
        })

        const ensResults = await Promise.all(ensPromises)
        const ensMap = ensResults.reduce((acc, { address, ensName }) => {
          if (ensName) {
            acc[address] = ensName
          }
          return acc
        }, {} as Record<string, string>)

        setEnsNames(ensMap)
      } catch (error) {
        console.error('Failed to load members:', error)
      } finally {
        setLoading(false)
      }
    }

    loadMembers()
  }, [])

  const filteredMembers = members.filter((member) => {
    const searchLower = searchTerm.toLowerCase()
    const ensName = ensNames[member.owner]
    return (
      member.owner.toLowerCase().includes(searchLower) ||
      (ensName && ensName.toLowerCase().includes(searchLower))
    )
  })

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const getDisplayName = (address: string) => {
    const ensName = ensNames[address]
    return ensName || formatAddress(address)
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by address or ENS..."
            className="max-w-sm"
            disabled
          />
        </div>
        <div className="text-center py-8">
          <div className="text-muted-foreground">Loading members...</div>
        </div>
      </div>
    )
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
              <TableHead className="w-12"></TableHead>
              <TableHead>Address/ENS</TableHead>
              <TableHead className="text-right">Gnars Held</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMembers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                  {searchTerm ? 'No members found matching your search.' : 'No members found.'}
                </TableCell>
              </TableRow>
            ) : (
              filteredMembers.map((member) => (
                <TableRow key={member.owner}>
                  <TableCell>
                    <CircleUserRound className="h-8 w-8 text-muted-foreground" />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <span className="font-medium">
                        {getDisplayName(member.owner)}
                      </span>
                      {ensNames[member.owner] && (
                        <span className="text-xs text-muted-foreground">
                          {formatAddress(member.owner)}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-col items-end gap-1">
                      <span className="font-medium">{member.tokenCount}</span>
                      <span className="text-xs text-muted-foreground">
                        #{member.tokens.join(', #')}
                      </span>
                    </div>
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
  )
}