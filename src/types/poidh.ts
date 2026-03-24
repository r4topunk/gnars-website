// POIDH Bounty Types

export enum BountyStatus {
  OPEN = 0,
  CLAIMED = 1,
  COMPLETED = 2,
  CANCELLED = 3,
}

export interface PoidhBounty {
  id: string;
  chainId: number;
  name: string;
  description: string;
  amount: string; // Wei string
  issuer: string;
  claimer?: string;
  createdAt: number;
  deadline?: number;
  status: BountyStatus;
  isOpenBounty: boolean;
  claims?: PoidhClaim[];
  participants?: string[];
}

export interface PoidhClaim {
  id: string;
  bountyId: string;
  claimer: string;
  name: string;
  description: string;
  proofUrl: string;
  createdAt: number;
  status: 'pending' | 'accepted' | 'rejected' | 'voting';
  votes?: {
    for: number;
    against: number;
  };
}

export interface PoidhApiResponse {
  result: {
    data: {
      json: {
        bounties: PoidhBounty[];
        total: number;
      };
    };
  };
}
