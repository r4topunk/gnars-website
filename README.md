# Rebuilding the Gnars DAO Website – Architecture Overview

## Tech Stack & Base Integration

Our new Gnars DAO site will be built with **Next.js 15.5** (using the App Router for modern best practices) and styled with **Tailwind CSS + Shadcn UI** for a clean, responsive design. We’ll leverage **Coinbase’s OnchainKit** for web3 infrastructure on Base, which provides ready-made React components and hooks (e.g. wallet connect, onchain data fetching) to speed up development. We target **Base** as the primary network – configuration will default to Base Mainnet for all onchain calls. Internationalization is out-of-scope initially (English-only UI), keeping things simple. Finally, we will ensure the app is easily deployable on **Vercel** (leveraging Next.js’s built-in optimizations for serverless deployment).

### Key architectural decisions:

| Category         | Decision             | Justification                                                                                                                                                                                                                                                                                                                                                                                                    |
| ---------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Structure**    | Monorepo (Turborepo) | Follow Builder DAO’s approach by structuring as a monorepo. One package will be the Next.js 15 app (the web frontend), and we can include utility packages or use Builder’s NPM packages for consistency. This keeps our code organized and aligns with best practices from Builder DAO.                                                                                                                         |
| **Onchain Data** | Hooks/SDK            | Instead of writing low-level web3 calls, we’ll use high-level hooks and SDK functions. For example, OnchainKit’s built-in hooks or Builder’s `@buildeross/hooks` provide data like current auction info, votes, token balances, etc., with minimal config. This agentic coding approach (composing behaviors through hooks) means each feature (auctions, proposals, treasury) can fetch its data declaratively. |
| **Chain Config** | Base Chain           | We will incorporate Base chain IDs and RPC endpoints in a config. Builder’s SDK supports multi-chain including Base. We’ll likely hardcode Gnars DAO’s contract addresses (NFT, Auction, Governor, Treasury) since we focus on a single DAO (or retrieve them with a helper like `getDAOAddresses`).                                                                                                             |

## DAO Overview Page (Home)

The landing page for the DAO will provide a high-level overview of Gnars DAO and links to sub-sections. This page gives context about the DAO and key stats:

- **DAO Metadata**: We’ll display the Gnars DAO name, tagline/description (“Action sports accelerator and community-owned brand…”) and the fact it’s Nounish and on Base chain. If available via the Builder DAO metadata contract or subgraph, we’ll fetch and show this info. (On nouns.build, Gnars is described as “Action sports accelerator and community owned brand. Headless so you can shred more…” in the explore list.)
- **Key Stats**: We show total members (total NFT supply), current auction number, and chain/network. From Builder’s UI, we know they display Total Supply, Owners, and Chain. We will include those. For Gnars, “Total supply” and number of owners can come from the NFT contract (e.g. `ERC721 totalSupply` and unique holder count via subgraph).
- **Founders Info**: If the DAO had a founders’ token allocation, we would show it. In Gnars’ case, Builder’s contracts indicate “No founders allocation set.”, which we will reflect. This confirms Gnars tokens are 100% community-distributed via auctions.
- **Navigation**: The overview will include navigation tabs or links to the main sections (Auctions, Treasury, Proposals/Governance, Members). On nouns.build, the DAO page has tabs for “About,” “Treasury,” “Activity,” and “Contracts”. We’ll implement similar navigation in our UI.

Under the hood, data fetching on this page can utilize Builder’s GraphQL or hooks:

- Builder’s SDK provides a `daoQuery` to get complete DAO info including settings and stats. We can call that (or use OnchainKit’s data API if available) to populate supply and other metadata.
- The Contracts addresses (NFT, Auction House, Governor, Treasury, etc.) will be stored and displayed (similar to Builder’s “Contracts” tab). We can hardcode these or fetch via `getDAOAddresses` in the SDK for maintainability.

## Auction System UI

Gnars DAO runs perpetual NFT auctions (one Gnar every set interval), so the Auctions page is critical. We will design an intuitive interface for both the current live auction and past auctions:

- **Current Auction Display**: At the top, show the latest Gnar NFT up for auction with its image, ID number, auction ending time countdown, and current highest bid. This mirrors nouns.build’s display: “Latest Auction – Gnars #6889 – August 29, 2025” with a live countdown. We’ll use a React hook for the countdown timer (Builder provides `useCountdown` for formatted time left). The “Place Bid” button (enabled when wallet is connected) will initiate a bid transaction via OnchainKit’s transaction flow.
- **Past Auctions Navigation**: Users should easily browse or search past Gnar auctions. We will include a scrollable list or gallery of previous NFTs with thumbnails, sold price, and winner address. For a richer UX, we can implement a chart of auction history (as hinted by the “auction chart” on nouns.build) – e.g. a simple line or bar chart of winning bid prices over time. This helps visualize trends without overwhelming the UI. Builder’s subgraph query `auctionHistory` can provide historical auction data (token IDs, bids, winners). We’ll fetch this and perhaps utilize a lightweight chart library for visualization.
- **Auction Component Architecture**: We will likely create a Next.js React Server Component for the auction list (fetching historical data server-side for SEO), and a Client Component for the live auction (to handle real-time updates like the countdown and new bids). Data access will be through hooks like `useDaoAuction` to get current auction status (highest bid, tokenId, end time) and a custom fetch (or SDK call) for past auctions.
- **Bid Flow**: Thanks to OnchainKit, integrating a bid flow is simplified. We will use a provided wallet connector (e.g. Coinbase Wallet or WalletConnect) and an OnchainKit component or our own button that calls the Auction House contract’s `createBid` function. OnchainKit’s example templates include transaction flow patterns we can emulate (ensuring the UI provides feedback during the blockchain transaction). The bid component will verify the bid meets the minimum increment and then send the transaction.

By following Builder DAO’s patterns, we ensure the auction system is robust. For instance, the hook `useDaoAuction` returns the current `highestBid`, `tokenId`, and `endTime` which we directly display. We will also incorporate responsive design here – the auction image and info will resize or stack for mobile screens (Shadcn’s responsive utilities will help maintain a “simple and beautiful” layout).

## Treasury Dashboard

The Treasury page provides an overview of the DAO’s finances – both ETH balance and any other assets (ERC-20 tokens or NFTs) held by the DAO treasury contract. We will implement the following:

- **ETH Balance & Value**: Display the current ETH balance of the treasury and its USD equivalent. In Builder’s UI, the treasury tab shows “ETH Balance” and “ETH Balance in USD”. We will fetch the treasury address from config (for Gnars, the treasury contract is at `0x72Ad98...f88`) and use a provider call or OnchainKit utility to get its ETH balance. The conversion to USD can be done via an API (CoinGecko) or omitted for simplicity at first.
- **Total Auction Proceeds**: Show the cumulative ETH raised from all auctions. Since 100% of auction sales go to the treasury, this could be derived from subgraph data (sum of all winning bids). Builder’s interface labels this “Total Auction Sales”. We can pre-compute this via GraphQL (`auctionHistory` sum) and display it.
- **Other Tokens**: List any ERC-20 tokens held by the treasury (token symbol, quantity, and USD value if needed). We’ll scan token holdings using OnchainKit or an etherscan API for the treasury address. In the UI, we’ll have a section for “Tokens”. If none, we indicate “None” or simply show an empty state.
- **NFT Holdings**: Occasionally, DAOs might hold NFTs (if they’ve purchased any via proposals). We’ll include a “NFTs in Treasury” section listing any ERC-721 or ERC-1155 assets the treasury owns (with a small image preview if possible). This can be fetched via a subgraph or OpenSea API by checking the treasury address.
- **Transactions / History (optional)**: A table of recent treasury transactions (inflows from auctions, outflows from executed proposals) could be included for transparency. This might be a stretch goal – but using the Governor’s event logs we can list, for example, “Executed Proposal X – Sent 1 ETH to Y on date Z”. OnchainKit’s components might not directly provide this, so we may defer detailed history in favor of focusing on current balances first.

To build this page, we will utilize server-side data fetching for initial balances (so it loads fast) and possibly client-side polling for up-to-date ETH balance. We’ll ensure Base chain integration by using Base’s block explorer APIs or RPC; since Base has low fees, even querying onchain for each token balance is feasible.

For code reference, the Builder SDK offers contract ABIs for ERC-20 and ERC-721 and could let us call `balanceOf` for each known token. However, a simpler approach is to use a GraphQL query from Builder’s subgraph if available, or the OnchainKit hook that fetches token balances (the Builder hooks documentation highlights “token interactions” as a feature). We might also repurpose Builder’s `useTokenBalances` or similar utility if provided to retrieve all token holdings of an address.

Overall, the treasury UI will be clean and informative, using Shadcn cards or table components to neatly display balances. This gives DAO members a quick understanding of available funds at a glance.

## Proposal Display & Voting

On the governance side, our site will support viewing proposals, reading their details in rich format (Markdown), and checking voting status – essentially a proposal explorer. Key elements:

- **Proposals List (Activity Feed)**: We’ll show a list of all proposals (active, passed, or failed). Each entry might display the proposal title, status (e.g. Active, Executed, Defeated), and the voting period timeline. Users can click a proposal to view details. On nouns.build, this is integrated under the “Activity” tab (which likely lists both auctions and proposals chronologically). To keep it simple, we might dedicate a Proposals page listing proposals by number. We can source this via the Governor contract or subgraph. Builder’s GraphQL likely has a query for proposals, or we can use the Governor contract’s event logs (`ProposalCreated` events) to build the list.
- **Proposal Detail View**: When a user selects a proposal, they’ll see a detailed page (or modal) with all information:
  - **Proposal Title & Description**: The content is written in Markdown by the proposer. We will retrieve this from off-chain storage (likely IPFS or the Ethereum Attestation Service as used by Builder). For example, in Prop 81 (a Gnars “droposal”), the description is stored and displayed including Markdown headings and formatting. We’ll use a Markdown renderer (perhaps a Shadcn component or `remark` library) to safely display this content.
  - **Proposer and Dates**: Show who created the proposal and when (and proposal ID). E.g., “By `0xeed...6a282` – Proposed on May 1, 2025”. If possible, resolve the proposer’s ENS name via `useEnsData` hook for a nice display.
  - **Voting Status**: Display the vote counts For, Against, Abstain and the quorum/threshold required. This data comes from the Governor contract’s state. Builder’s hooks include `useVotes` which can tell if the connected user has voting power and the threshold to propose, and the SDK has `getProposalState` to fetch the current state of a given proposal ID. We’ll show progress bars or at least numbers for each choice. If a proposal is active and the user has tokens, they can cast their vote (via connected wallet) directly on this page.
  - **Human-Readable Transactions**: For on-chain proposals, it’s crucial to show what actions the proposal will execute in a readable way. We will list each proposed transaction with target contract and function call decoded. For example, Prop 81’s detail shows a transaction calling `.createEdition(...)` with all parameters expanded. We can achieve this by leveraging the ABI data from Builder’s SDK to decode function signatures and args. Our UI will present a numbered list of proposed actions, each with the contract name (or address) and function name with parameters. This helps users understand proposals without reading raw hex. (Builder likely uses a combination of ABIs and custom decoding for this – we can do similar by importing the relevant contract ABI (like `auctionAbi`, `treasuryAbi`, etc.) from `@buildeross/sdk` and using a utility to format the call data.)
  - **Votes List**: Optionally, list which members voted for or against. This could be a collapsible section showing each voter’s address (or ENS) and vote choice, as provided by Governor events. Since Gnars is a Nouns-style DAO, each NFT gives 1 vote; showing major voters or delegate votes might add context. If not immediately, we can include a link to an explorer for detailed vote breakdown.

Behind the scenes, we’ll use GraphQL or EAS to get proposal text. The Builder SDK mentions EAS integration – likely the proposal descriptions are stored as EAS attestations or IPFS. We will follow that approach to retrieve the content given a proposal ID or IPFS hash. Additionally, the voting data can be fetched via the subgraph (which tracks votes per proposal) or via direct contract calls (`getProposalVotes` in Governor contract).

**Voting interaction**: If a proposal is Active, users can click “Vote For/Against/Abstain.” OnchainKit should allow sending these transactions easily (the Governor contract’s `castVote` or `castVoteWithReason` function). We’ll integrate a small form or buttons for this, only enabled for token holders (the `useDaoMembership` hook can confirm if the user has a Gnar token). After voting or when proposal ends, the UI updates to show final tallies.

This comprehensive proposal UI ensures that Gnars members can read and assess proposals with full context, aligning with Gnars’ existing proposal format (which often includes rich media, as seen with embedded IPFS links in descriptions).

## Proposal Creation Form

To empower Gnars DAO members to create new proposals through the website, we will implement a proposal builder interface. This will be one of the more interactive parts of the app, allowing markdown editing and transaction crafting in a user-friendly way:

- **Eligibility Check**: First, we ensure the user is eligible to propose. In Nounish DAOs, a proposer typically needs a certain number of tokens or delegated votes. We will use the `useVotes` hook to check `hasThreshold` (whether the user meets the proposal threshold). If not, we’ll disable the form and indicate they need more votes or delegation.
- **Markdown Editor for Description**: We’ll provide a rich text area for the proposal description, supporting Markdown syntax. This lets proposers write formatted text, embed images via IPFS links, etc. We can use a simple Markdown editor component (there are React libraries or we can use a textarea with preview). The content will later be uploaded to IPFS or sent to an attestation service. For instance, we might integrate with the OnchainKit/Builder IPFS service to store the markdown file and get a CID, or call EAS to record the text on-chain (Builder’s EAS client could be used).
- **Transaction Builder**: The form will allow adding one or multiple actions that the proposal will execute if passed. Common action types we’ll support:
  - Sending ETH from the treasury: e.g. choose “Send ETH”, then input recipient address and amount.
  - ERC-20/token transfer: choose token contract and amount to send (if treasury holds other tokens).
  - Contract calls: the user can specify a contract address (or select one of the known DAO contracts) and function to call with parameters. We will integrate with the ABI definitions for known contracts to provide a drop-down of functions for the Governor/Treasury or even external contracts.
  - NFT drop (Droposal) creation: (more below in Droposals section, but essentially a specialized contract call to create an edition). We will use dynamic form fields to capture these, and each action will be translated into the low-level data (target address, value in ETH, calldata bytes). Builder’s approach likely has a similar multi-step proposal editor, building an array of transactions. We might reference how Builder’s governance UI structures the proposal object – typically an array of `targets`, `values`, `calldatas` that get submitted to the Governor’s `propose` function.
- **Preview & Verification**: Before submission, the user can preview the proposal: render the markdown to ensure it looks correct, and list the transactions with human-readable descriptions (much like the proposal detail view does). This is essentially reusing our decoding logic client-side for review. If something looks off, the user can edit further.
- **Submission Flow**: Once ready, the user hits “Submit Proposal”. The app will then:
  1.  Upload the markdown description to IPFS (retrieving a CID) or create an attestation.
  2.  Call the Governor contract’s `propose()` function via the wallet, passing in the transactions (and possibly the IPFS CID or attestation ID as part of the description field). In Compound’s Governor Bravo (which Nouns uses), the proposal function takes `targets[]`, `values[]`, `signatures[]`, `calldatas[]`, `description`. Nouns Builder likely has a similar interface, possibly storing the description off-chain but linking it.
  3.  OnchainKit can help with handling the transaction. We’ll give feedback to the user (transaction pending, then confirmation).
  4.  After submission, the new proposal should appear in the list (we can prompt the user to view it).

We will keep this UI simple and guided – perhaps using a step-by-step wizard (Step 1: Description, Step 2: Actions, Step 3: Review & Submit) to not overwhelm users. Using Shadcn UI components (like Tabs or Accordion for multiple actions) will maintain a clean look.

For code insights, we can draw from BuilderDAO’s implementation:

- The Builder DAO likely encodes markdown proposals as EAS attestations. Our approach might simplify to IPFS for now, but we know EAS is integrated. In future, adopting EAS (with e.g. `attestProposal(descriptionHash)`) could be a nice upgrade.
- They also support multiple transaction types, as evidenced by proposals that create Zora editions, transfer funds, etc. We may look at how they differentiate these in code. Regardless, our form just collects generic actions, so we won’t hardcode for specific “droposal vs normal” – the user’s chosen actions will define that.

By providing a robust yet straightforward proposal creation tool, we empower the community to use the Gnars site for governance without needing external dapps. The focus remains on clarity (Markdown for readability) and completeness (supporting all necessary transaction types).

## NFT Drop Proposals (“Droposals”)

“Droposals” are a special kind of proposal in Builder DAO’s ecosystem – essentially on-chain proposals that initiate an NFT drop to raise funds or distribute art, with revenue sharing for the DAO. Gnars has utilized droposals (e.g., Prop 81 “Uganda Connection Film” drop) to great effect. We will make sure our site supports and highlights droposals:

- **Detection & Labeling**: A droposal is typically identified by the transactions it contains. For example, Prop 81 executed a call to Zora’s `EditionCreator.createEdition()` function. We can programmatically detect if a proposal’s transactions include a call to a known Zora Edition or similar contract and then label the proposal as a “Droposal” in the UI. In the proposal list, we might tag it with a special icon or the text “Drop”. On the proposal detail, we can replace the word “Proposal” with “Droposal” in the title, as the Builder interface does (it showed “Droposal Uganda Connection Film” for Prop 81).
- **Display Extra Info**: For droposals, the content often includes links to the drop’s assets (posters, film, etc.) and the drop mechanics (price, edition size, split). We will parse the transaction call data to extract key info, presenting it clearly. In Prop 81’s example, we can show:
  - **Edition Name** (“Uganda Connection”), **Edition Size** (open edition or specific number), **Price** (0.005 ETH), **Royalty**, **Funds Recipient**, etc.. All of these were parameters in the `createEdition` call, which we can display in a reader-friendly table.
  - We will also provide a direct link or button to the actual drop page if applicable (e.g., if the drop contract address is known, we could link to Zora’s mint interface or embed a mint widget).
- **Proposal Creation Support**: In our proposal form, if a user wants to create a droposal, they would add a “Create Edition” action. We can simplify this by offering a predefined template for a drop: the form could ask for the fields (name, symbol, price, duration, etc.) and then internally prepare the contract call data for `createEdition`. This way, a proposer doesn’t need to manually know the function signature – they fill out a form for the drop and our app generates the corresponding transaction. This will encourage more use of droposals by lowering the technical barrier.
- **Revenue Accounting**: Since droposals generate revenue for the DAO when people mint the edition, we might want the treasury page to reflect that income. We can potentially highlight if an ongoing drop is active (though in most cases proposals execute and then the drop contract handles the rest off-site). We’ll stick to just identifying and formatting droposals on the governance side.

Implementing droposal features aligns with Builder DAO’s latest governance enhancements (they explicitly funded “Droposal legacy support” and related UI improvements). By ensuring droposals are first-class in our app, we future-proof Gnars for creative fundraisers.

Technically, this means having the ABI for Zora’s edition contract and recognizing its function calls. We have access to `zoraNftCreatorAbi` via Builder’s SDK, which likely includes `createEdition`. We’ll use that to encode/decode droposal transactions.

## DAO Members & Delegates

A community site isn’t complete without acknowledging the members. We will create a DAO Members page that lists all current Gnar holders and key delegate information:

- **Members List**: A directory of all wallet addresses holding at least one Gnar NFT. For each member, we can show their address (or ENS), the number of Gnars they hold, and perhaps their join date (the first time they acquired a Gnar, which could be inferred from token transfer events). If the list is long (Gnars has thousands of tokens), we’ll implement pagination or lazy-loading. This feature can reuse an existing component from Builder – indeed, BuilderDAO’s component toolkit includes a “Members List” embed, indicating this data is accessible. We might fetch from the subgraph: the `daoQuery` or a specific `daoMembers` query could give all token holders. Alternatively, using OnchainKit’s GraphQL Data API for Base or a service like Bitquery could fetch holders of the NFT contract.
- **Voting Power & Delegation**: In Nounish DAOs, token holders can delegate their votes. We will highlight delegates – perhaps show a separate section of “Top Delegates” with their vote count. From the Gnars overview snippet, there is a “Delegates” table with columns for Delegate, Votes, Vote % and Joined date, suggesting that builder.nouns.build tracks delegates. We will replicate something similar:
  - Identify which addresses have others delegating to them (the Governor contract keeps track of delegate votes). We can get this from subgraph (`daoVoters` or `daoVotes` queries, maybe sorted by votes).
  - Display delegates in order of voting power. Provide an “Export CSV” option like Builder does, which is useful for analysis (we can generate a CSV on the fly or precompute it).
  - If a connected user hasn’t delegated, we could allow them to delegate from this page (choose a delegate and submit a `delegate` transaction).
- **Profile Pages (Future)**: If time permits, clicking a member could show a mini profile: their holdings, their proposals or votes (history of participation). This is not a core requirement, but structurally we can route to `/member/[address]` pages that fetch that specific data. Initially, we might skip this depth to keep things simple.

To build the members list efficiently, server-side rendering using the subgraph is ideal (so we don’t fetch thousands of entries in the client). We’ll use a combination of Next.js incremental static props or server actions to fetch the list of holders at build time or on demand. Given that Gnars has continuous auctions, the member list updates with each new auction winner, so some revalidation schedule or on-demand update might be set (maybe revalidate once a day or allow manual refresh).

UX-wise, the Members page will use a simple table layout (Shadcn’s table components) or a list of cards on mobile. It should be searchable so users can find a specific address or ENS name quickly.

## Deployment & Best Practices

The application will follow **Next.js 15** best practices:

- We’ll use the **App Router** and **server components** wherever possible to load data (for SEO and performance), falling back to client components only for interactive parts (bidding, form inputs, etc.). This hybrid approach ensures fast initial loads and a snappy feel.
- **Routing**: We’ll structure routes in a logical way. For example:
  - `/` -> DAO overview (with maybe a redirect to `/auction` or an overview section)
  - `/auction` -> detailed auction page (or we might combine this with home if desired)
  - `/proposals` -> list of proposals; `/proposals/[id]` -> proposal detail
  - `/propose` -> proposal creation form
  - `/treasury` -> treasury dashboard
  - `/members` -> members list
    This focuses on a single DAO, so we don’t need dynamic `[dao]` identifiers in routes, simplifying things. We will, however, keep a config file with the DAO’s addresses and constants (so if we ever want to switch to a different DAO, it’s centralized).
- **Styling**: With **Tailwind** and **Shadcn UI**, we’ll maintain consistency and mobile-friendliness. We’ll favor Shadcn’s pre-built accessible components (dialogs, tooltips for explanation of governance terms, etc.). The design will remain minimalist – lots of whitespace and clear typography – aligning with Nouns’ aesthetic but tailored to Gnars’ branding (we can use Gnars’ color palette or logo in the design, referencing Gnars art for accent visuals).
- **Security & Validation**: We’ll incorporate best practices like input validation (especially in proposal creation – e.g., check that addresses are valid, numbers are in range, etc.). We will also use client-side form validation schemas possibly inspired by Builder’s utils (they mention Yup schemas in `@buildeross/utils`).
- **Testing & Deployment**: The site will be containerized or deployed directly to **Vercel** for simplicity. Next 15’s build output is optimized for edge, and we ensure no server-side secrets (any API keys for, say, IPFS or The Graph can be kept in environment vars on Vercel).

By adhering to these practices, our Gnars site will be fast, reliable, and easy to maintain. The architecture emphasizes reusing proven components (Builder OSS hooks/sdk, OnchainKit) and keeping the scope focused on core DAO functionality – avoiding unnecessary complexity. This sets the stage for quickly implementing the features with high confidence, as each part maps to known patterns and reference code from Builder DAO’s repositories.

## References

- [Builder DAO Monorepo (Nouns Builder) – packages and architecture](https://github.com/BuilderOSS/nouns-builder)
- [Gnars actual website repository – packages and architecture](https://github.com/sktbrd/gnars-terminal)
- [@buildeross/hooks - npm](https://www.npmjs.com/package/@buildeross/hooks)
- [@buildeross/sdk - npm](https://www.npmjs.com/package/@buildeross/sdk)
- [Nouns Builder | Gnars](https://nouns.build/dao/base/0x880Fb3Cf5c6Cc2d7DFC13a993E839a9411200C17/6889)
- [Nouns Builder | Gnars - Prop 81](https://nouns.build/dao/base/0x880fb3cf5c6cc2d7dfc13a993e839a9411200c17/vote/81)
- [Builder - Prop 44 - Nouns Builder](https://nouns.build/dao/base/0xe8aF882f2f5C79580230710Ac0E2344070099432/vote/44)
- [Builder Components](https://buildercomponents.wtf/)
- [Base | OnchainKit](https://www.base.org/build/onchainkit)
- [Nouns Builder | Nouns your ideas](https://nouns.build/)
