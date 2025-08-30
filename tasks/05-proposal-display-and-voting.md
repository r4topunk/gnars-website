# Task: Proposal Display & Voting

This task focuses on building the proposal list and detail pages, matching the single-column layout provided in the reference screenshot.

### Sub-tasks:

- [ ] **Proposals List Page (`/proposals`)**:
    - [ ] **Data Fetching**: Fetch all proposals from the official Builder DAO subgraph, sorted by proposal ID in descending order (`orderBy: id, orderDirection: desc`).
    - [ ] **Display**: Use a Shadcn `Table` to list proposals with columns for `ID`, `Title`, and `Status`.
        - [ ] Use a `Badge` for the status with specific colors: `bg-green-500` for Executed, `bg-blue-500` for Active, `bg-red-500` for Defeated, `bg-gray-500` for Canceled.

- [ ] **Proposal Detail Page (`/proposals/[id]`)**:
    - [ ] **Layout**: Implement a single-column layout as specified in the screenshot.
        - [ ] **Header**: Display "Proposal #{id}", the status `Badge`, and an external link icon linking to the proposal on a block explorer.
        - [ ] **Title**: Display the proposal title as a main heading.
        - [ ] **Author**: Display "By {proposer_ens_name}".
        - [ ] **Metrics Grid**: Create a responsive grid of `Card` components for: `For Votes`, `Against Votes`, `Abstain Votes`, `Threshold`, `End Date`, and `Snapshot Block`.
        - [ ] **Voting Controls**: If the proposal is active, display `Button` components for "Vote For", "Vote Against", and "Vote Abstain".
    - [ ] **Tab Navigation**: Implement a `Tabs` component with three tabs: `Details`, `Votes`, and `Propdates`.
        - [ ] **Details Tab Content**: This tab should be active by default and contain:
            - A "Description" section with the rendered Markdown.
            - A "Proposer" section with the user's avatar and ENS name.
            - A "Proposed Transactions" section, which uses the human-readable decoding utility.
        - [ ] **Votes Tab Content**: This tab will contain a list/table of all individual votes, showing the voter's address, their vote choice (For/Against/Abstain), and the number of votes they cast.
    - [ ] **Voting UX**:
        - [ ] After a user votes, show a `sonner` toast notification confirming the action (e.g., "Your vote has been cast!").
        - [ ] The voting buttons should update. The selected option should be highlighted (e.g., with a checkmark icon) and all voting buttons should be disabled.
        - [ ] The list of votes under the `Votes` tab should update in real-time to include the user's new vote.

### References
- Proposals list/detail via Builder subgraph SDK (state with `getProposalState`):
  - `references/nouns-builder/packages/sdk/src/subgraph/requests/proposalsQuery.ts`
  - `references/nouns-builder/packages/sdk/src/subgraph/requests/proposalQuery.ts`
- Decode proposed transactions (human-readable):
  - `references/nouns-builder/packages/hooks/src/useDecodedTransactions.ts`
- Governor voting functions (castVote / castVoteWithReason):
  - `references/nouns-builder/packages/sdk/src/contract/abis/Governor.ts`
- Propdates (EAS-based updates) to include as a tab:
  - `references/nouns-builder/apps/web/src/modules/proposal/components/PropDates/PropDates.tsx`