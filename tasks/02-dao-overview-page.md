# Task: Home Page (Overview & Auction)

This task focuses on building the main landing page, which features the DAO overview and the live auction component.

### Sub-tasks:

- [ ] **Page & Layout**:
    - [ ] Create the route and page file for the home page (`src/app/page.tsx`).
    - [ ] Implement the main navigation header using Shadcn's `NavigationMenu`. The links should be `Proposals`, `Treasury`, `Members`, and `Propdates`. The active link should use the default styling provided by the component.
- [ ] **DAO Header Component**:
    - [ ] Create a component to display the DAO's name and description.
    - [ ] Add a `Badge` component with the `default` variant (blue) indicating "on Base".
- [ ] **Key Stats Component**:
    - [ ] Create a server component to display key metrics in a `Card` layout.
    - [ ] The stats should be displayed in this order: `Current Auction`, `Total Supply`, `Members`.
    - [ ] Fetch the required data using a combination of `viem` and the official subgraph.
- [ ] **Contracts List Component**:
    - [ ] Create a component to display the list of core DAO contract addresses.
    - [ ] For each contract, display its name and full address.
    - [ ] Add a "copy to clipboard" `Button` next to each address, using the `Copy` icon from `lucide-react`. No toast notification should appear on click.