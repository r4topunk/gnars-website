export interface PoidhBounty {
  id: number;
  onChainId: number;
  chainId: number;
  title: string;
  name: string;
  description: string;
  amount: string;
  issuer: string;
  createdAt: number;
  inProgress: boolean;
  isJoinedBounty: boolean;
  isCanceled: boolean;
  isMultiplayer: boolean;
  isVoting: boolean;
  isOpenBounty?: boolean;
  deadline: number | null;
  amountSort: number;
  hasClaims: boolean;
  hasParticipants: boolean;
}
