# Task: Auction Component (for Home Page)

This task covers the UI for the live auction and past auctions, which will be displayed on the main home page.

### Sub-tasks:

- [ ] **Current Auction Component (Client Component)**:
    - [ ] **Data Fetching**: Use the `@buildeross/hooks` `useDaoAuction` hook to get live auction data (`highestBid`, `tokenId`, `endTime`).
    - [ ] **Display**:
        - [ ] Show the Gnar NFT image for the current `tokenId`.
        - [ ] Display the title: "Latest Auction – Gnars #{tokenId}".
        - [ ] Use the `useCountdown` hook from `@buildeross/hooks` to display a live countdown timer formatted as `HH:MM:SS`.
        - [ ] Display the current highest bid and the bidder's address (with ENS resolution).
    - [ ] **Bidding Flow**:
        - [ ] Create a "Place Bid" `Button` that is only enabled if a wallet is connected.
        - [ ] The bid input should enforce the minimum bid increment (current bid * 1.02).
        - [ ] On click, call the `createBid` function on the Auction House contract using `wagmi`'s `useWriteContract`.
        - [ ] Use `sonner` to provide feedback: `toast.info(...)` on submission, `toast.success(...)` on confirmation.
- [ ] **Past Auctions Component (Server Component)**:
    - [ ] **Data Fetching**: Fetch historical data using the `auctionHistory` query from the official Builder DAO subgraph.
    - [ ] **Display**: Render a responsive grid of past auctions using Shadcn's `Card` component. Each card shows the Gnar thumbnail, winning bid, and winner.
    - [ ] **Pagination**: Implement a "Load More" button to fetch and append the next page of results from the subgraph.