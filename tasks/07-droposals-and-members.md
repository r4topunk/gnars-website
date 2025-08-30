# Task: Droposals & Members Page

This task covers special handling for "Droposals" and building the community members page, with explicit UI and library recommendations.

### Part 1: Droposal Features

- [ ] **Droposal Detection Logic**:
    - [ ] Create a utility that checks a proposal's `targets` array for the Zora `EditionCreator` contract address and checks the function signature.
    - [ ] Use this utility to conditionally apply a "Droposal" `Badge` in the UI.
- [ ] **Enhanced Droposal Display**:
    - [ ] The banner image associated with a droposal should be used as the primary visual for its card in any grid-based layout of proposals/droposals.
    - [ ] The banner image should **not** be displayed on the droposal's main detail page.
    - [ ] On the detail page, use the `zoraNftCreatorAbi` and `viem`'s `decodeFunctionData` to parse and display the droposal parameters in a `Table`.

### Part 2: Members & Delegates Page

- [ ] **Page & Layout (`/members`)**:
    - [ ] Create the page with two `Tabs`: "Members" and "Delegates".
- [ ] **Members Tab**:
    - [ ] **Data Fetching**: Use the official Builder DAO subgraph to fetch all Gnar holders.
    - [ ] **Display**: Use a Shadcn `Table` with columns in this order: `Avatar` (`CircleUserRound` icon), `Address/ENS`, `Gnars Held`.
    - [ ] **Features**:
        - [ ] Implement server-side search on the address/ENS column.
        - [ ] Use Next.js Incremental Static Regeneration (ISR) (`revalidate: 3600`) to keep the data fresh.
- [ ] **Delegates Tab**:
    - [ ] **Data Fetching**: Use the subgraph to query for accounts with delegated votes, sorted by vote count.
    - [ ] **Display**: Create a table with columns in this order: `Delegate`, `Votes`, `Vote %`.

### References
- Droposal detection and decoding:
  - `references/nouns-builder/packages/sdk/src/contract/abis/ZoraNFTCreator.ts` (createEdition)
  - `references/gnars-terminal/src/components/proposal/transactions/utils/droposalABI.ts` (current site reference)
- Members and delegates via Builder subgraph:
  - `references/nouns-builder/packages/sdk/src/subgraph/sdk.generated.ts` (DAO.owners, DAO.voters)
  - `references/nouns-builder/packages/sdk/src/subgraph/requests/memberSnapshot.ts`