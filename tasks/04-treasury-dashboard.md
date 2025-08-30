# Task: Treasury Dashboard

This task involves building the treasury page to give a clear financial overview, with a focus on a clean UI/UX and explicit data formatting.

### Sub-tasks:

- [ ] **Page & Layout**:
    - [ ] Create the route at `src/app/treasury/page.tsx`.
    - [ ] The layout should have a clear hierarchy:
        - [ ] **Primary Metric**: A single, full-width Shadcn `Card` at the top displaying the total USD value of the entire treasury.
        - [ ] **Secondary Metrics**: A 2-column responsive grid below the primary card for other metrics like "ETH Balance" and "Total Auction Sales".
- [ ] **Data Formatting & Display**:
    - [ ] All currency values must be formatted using the standard `Intl.NumberFormat` API for the `en-US` locale.
    - [ ] ETH balances should be formatted to 4 decimal places (e.g., `1,234.5678 ETH`).
    - [ ] USD values should be formatted to 2 decimal places (e.g., `$1,234,567.89`).
- [ ] **Token Holdings (ERC-20 & NFTs)**:
    - [ ] **Data Fetching**:
        - [ ] Use Alchemy's `alchemy_getTokenBalances` and `alchemy_getNfts` RPC methods to get all assets held by the treasury.
    - [ ] **Display (ERC-20)**:
        - [ ] Create a "Tokens" `Table` with the following columns: `Token`, `Amount`, and `Value (USD)`.
        - [ ] If the treasury holds no ERC-20 tokens, display a message: "The treasury currently holds no ERC-20 tokens."
    - [ ] **Display (NFTs)**:
        - [ ] Create an "NFTs" grid.
        - [ ] Each item in the grid should be a `Card` containing the NFT's image and its name/ID below it (e.g., "Gnar #6889").
        - [ ] If the treasury holds no NFTs, display a message: "The treasury currently holds no NFTs."

### References
- Use Gnars approach for treasury fetching (pioneers.dev portfolio API):
  - `references/gnars-terminal/src/hooks/useTreasure.ts`
- Builder Alchemy service (if/when switching to Alchemy):
  - `references/nouns-builder/apps/web/src/services/alchemyService.ts`