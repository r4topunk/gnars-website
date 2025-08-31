# Task: Proposal Creation Form

This task covers the interactive, multi-step wizard for creating and submitting new proposals, with a rich interface for defining transactions.

### Sub-tasks:

- [ ] **Page & Layout**:
  - [ ] Use Shadcn's `Tabs` to create a step-by-step wizard: "1. Details", "2. Transactions", and "3. Preview".
  - [ ] Implement an eligibility check using `useVotes` before allowing access to the form.

- [ ] **Step 1: Details**:
  - [ ] Add a text `Input` for the "Proposal Title".
  - [ ] Add a component for "Banner Image" upload. This should accept an image file, upload it to an IPFS pinning service, and store the resulting CID.
  - [ ] Add a Markdown editor (controlled `Textarea` with a `react-markdown` preview) for the main "Proposal Content".

- [ ] **Step 2: Transactions**:
  - [ ] Display a set of buttons for adding different action types: `Send ETH`, `Send Tokens`, `Send NFTs`, `Create Droposal`, and `Custom Transaction`.
  - [ ] When a button is clicked, add a new form item to a list where the user can fill in the details for that transaction.
  - [ ] **Action Forms**:
    - [ ] **Send NFTs**: Create a form with fields for `Contract Address`, `Token ID`, and `Recipient Address`.
    - [ ] **Custom Transaction**: Create a form that allows a user to paste a contract `Address`, the contract `ABI` (in a textarea), and then select a `Function` from the parsed ABI to populate the parameter fields.
    - [ ] **Create Droposal**: This form should contain all the fields specified below.

- [ ] **Droposal Form Template**:
  - [ ] Create a detailed form for the "Create Droposal" action with the following fields:
    - `Name` (text input)
    - `Symbol` (text input)
    - `Description` (textarea)
    - `Media` (IPFS file uploader for the NFT image/video)
    - `Price (ETH)` (number input)
    - `Edition type` (Radio group: `Fixed` or `Open`)
    - `Edition size` (number input, disabled if type is Open)
    - `Start time` & `End time` (date-time picker components)
    - `Mint limit per address` (number input, placeholder text "unlimited")
    - `Royalty (%)` (number input)
    - `Payout address` (text input)
    - `Default admin address` (text input)

- [ ] **Step 3: Preview**:
  - [ ] Display the title, banner image, and rendered Markdown from Step 1.
  - [ ] Display a human-readable summary of all transactions configured in Step 2.
  - [ ] On submission, upload all content/metadata to IPFS, construct the transaction(s), and use `wagmi`'s `useWriteContract` to call the `propose` function.

### References

- Eligibility with `useVotes`:
  - `references/nouns-builder/packages/hooks/src/useVotes.ts`
- Transaction decoding and preview:
  - `references/nouns-builder/packages/hooks/src/useDecodedTransactions.ts`
- Droposal (Zora createEdition) ABI and Builder form wiring:
  - `references/nouns-builder/packages/sdk/src/contract/abis/ZoraNFTCreator.ts`
  - `references/nouns-builder/apps/web/src/modules/create-proposal/components/TransactionForm/Droposal/Droposal.tsx`
- Propdates (EAS) utilities (for proposal updates text):
  - `references/nouns-builder/apps/web/src/modules/proposal/components/PropDates/PropDates.tsx`
