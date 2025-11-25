// GraphQL queries for Gnars DAO subgraph

export const PROPOSALS_QUERY = `
  query GetProposals($daoAddress: String!, $first: Int!, $skip: Int!) {
    proposals(
      where: { dao: $daoAddress }
      orderBy: timeCreated
      orderDirection: desc
      first: $first
      skip: $skip
    ) {
      id
      proposalId
      proposalNumber
      title
      description
      proposer
      timeCreated
      voteStart
      voteEnd
      snapshotBlockNumber
      forVotes
      againstVotes
      abstainVotes
      quorumVotes
      executed
      canceled
      vetoed
      queued
      transactionHash
      executableFrom
      expiresAt
    }
  }
`;

export const PROPOSAL_BY_NUMBER_QUERY = `
  query GetProposalByNumber($daoAddress: String!, $proposalNumber: Int!) {
    proposals(
      where: { dao: $daoAddress, proposalNumber: $proposalNumber }
      first: 1
    ) {
      id
      proposalId
      proposalNumber
      title
      description
      proposer
      timeCreated
      voteStart
      voteEnd
      snapshotBlockNumber
      forVotes
      againstVotes
      abstainVotes
      quorumVotes
      executed
      canceled
      vetoed
      queued
      transactionHash
      executableFrom
      expiresAt
    }
  }
`;

export const PROPOSAL_BY_ID_QUERY = `
  query GetProposalById($proposalId: String!) {
    proposals(
      where: { proposalId: $proposalId }
      first: 1
    ) {
      id
      proposalId
      proposalNumber
      title
      description
      proposer
      timeCreated
      voteStart
      voteEnd
      snapshotBlockNumber
      forVotes
      againstVotes
      abstainVotes
      quorumVotes
      executed
      canceled
      vetoed
      queued
      transactionHash
      executableFrom
      expiresAt
    }
  }
`;

export const VOTES_QUERY = `
  query GetVotes($daoAddress: String!, $proposalNumber: Int!, $first: Int!, $skip: Int!) {
    proposalVotes(
      where: {
        proposal_: { dao: $daoAddress, proposalNumber: $proposalNumber }
      }
      orderBy: timestamp
      orderDirection: desc
      first: $first
      skip: $skip
    ) {
      id
      voter
      support
      weight
      reason
      timestamp
      transactionHash
      proposal {
        proposalNumber
        title
      }
    }
  }
`;

export const RECENT_PROPOSALS_QUERY = `
  query GetRecentProposals($daoAddress: String!, $since: BigInt!) {
    proposals(
      where: { dao: $daoAddress, timeCreated_gt: $since }
      orderBy: timeCreated
      orderDirection: desc
      first: 100
    ) {
      id
      proposalId
      proposalNumber
      title
      description
      proposer
      timeCreated
      voteStart
      voteEnd
      snapshotBlockNumber
      forVotes
      againstVotes
      abstainVotes
      quorumVotes
      executed
      canceled
      vetoed
      queued
      transactionHash
      executableFrom
      expiresAt
    }
  }
`;
