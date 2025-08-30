# Task: Propdates & Droposal Minting Pages

This task covers the creation of the Propdates section, which will feature a gallery of all Droposals and individual minting pages for each one, as specified in the reference screenshot.

### Part 1: Main Propdates Gallery Page (`/propdates`)

- [ ] **Page & Layout**:
    - [ ] Create the route and page file at `src/app/propdates/page.tsx`.
    - [ ] **Data Fetching**: Fetch all proposals and filter them using the "Droposal detection utility" to get a list of all Droposals.
    - [ ] **Display**: Render the Droposals in a responsive grid using Shadcn's `Card` component.
        - [ ] Each card should prominently feature the Droposal's banner image.
        - [ ] The Droposal's title should be displayed below the image.
        - [ ] Each card must link to that Droposal's specific minting page (e.g., `/propdates/noggles-delta`).

### Part 2: Individual Droposal Minting Page (`/propdates/[slug]`)

- [ ] **Page & Layout**:
    - [ ] Create a dynamic route and page file at `src/app/propdates/[slug]/page.tsx`.
    - [ ] Implement the two-column layout from the screenshot.

- [ ] **Left Column Components**:
    - [ ] **Media Display**: A large `Card` that displays the Droposal's primary media (the banner image or an embedded video if the link is available).
    - [ ] **Community Supporters Card**:
        - [ ] **Data Fetching**: Fetch all `Transfer` events from the Droposal's specific NFT contract address to identify all minters.
        - [ ] **Display**: Show the supporters in a grid. Each supporter should be represented by a user avatar icon, their ENS name (or truncated address), and the quantity of tokens they minted.
        - [ ] If there are no supporters, display the text "No supporters found."

- [ ] **Right Column Components**:
    - [ ] **Description Card**:
        - [ ] Display the Droposal's title and full description text.
        - [ ] Display the Droposal's contract address (linking to Basescan) and the total supply of the NFT.
    - [ ] **Mint Droposal Card (Client Component)**:
        - [ ] This component should be titled "Mint Droposal".
        - [ ] Include a quantity stepper (`-` and `+` buttons with a number input) to select the mint amount.
        - [ ] Include a `Textarea` for an optional comment.
        - [ ] The main call-to-action `Button` should read "Collect for X ETH", where X is the price per mint multiplied by the quantity.
        - [ ] **Minting Logic**: On click, the button should call the `mint` or equivalent function on the Droposal contract, passing the quantity and comment. Use `wagmi` for the transaction and `sonner` for user feedback.