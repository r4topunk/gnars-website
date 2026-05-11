# Research — Gnars DAO Passed Proposals: Full Categorized List

## Goal

Enumerate all executed (passed + on-chain executed) Gnars DAO proposals on Base, categorize them by type, and surface patterns useful for DAO storytelling, website navigation, and community analytics.

## Data Source

- Subgraph: Goldsky `nouns-builder-base-mainnet` (project `cm33ek8kjx6pz010i2c3w8z25`)
- Filter: `dao: "0x880fb3cf5c6cc2d7dfc13a993e839a9411200c17"` (Gnars token), `executed: true`
- Fetched: 2026-03-19
- Service layer: `src/services/proposals.ts` — `listProposals()` uses `SubgraphSDK.connect(CHAIN.id).proposals()`

## Findings

### Snapshot

| Metric                   | Count |
| ------------------------ | ----- |
| Total proposals on-chain | 119   |
| Executed (passed)        | 77    |
| Canceled                 | 16    |
| Defeated / still active  | 26    |
| Queued                   | 0     |
| Vetoed                   | 0     |

---

### Category Breakdown

| Category                         | Count | % of Passed |
| -------------------------------- | ----- | ----------- |
| Athlete Sponsorship & Onboarding | 26    | 34%         |
| Event & Activation               | 13    | 17%         |
| Physical Installation            | 10    | 13%         |
| Content & Media                  | 8     | 10%         |
| Development & Tech               | 7     | 9%          |
| Droposal (NFT Drop)              | 6     | 8%          |
| Travel & Reimbursement           | 4     | 5%          |
| Community Partnerships           | 3     | 4%          |

---

### 1. Athlete Sponsorship & Onboarding (26)

Individual athletes/creators receiving recurring sponsorships or onboarding grants. Covers skateboarding, surfing, bodyboarding, downhill/freeride, content creation.

| #   | Title                                                                     |
| --- | ------------------------------------------------------------------------- |
| 1   | Bruno Piu - Onboarding                                                    |
| 5   | Dave Bachinsky renewal proposal Skateboarder                              |
| 7   | GnarsDAO Onboarding Content                                               |
| 8   | Yan Felipe Onboarding Proposal                                            |
| 11  | Fernando Ferreira Onboarding Proposal                                     |
| 14  | Renan Carvalho onboarding proposal                                        |
| 17  | Pharra Onboarding Proposal                                                |
| 18  | Estagirons Onboarding proposal                                            |
| 19  | Bernardo Nassar Sponsorship Proposal                                      |
| 21  | Mauricio Nava Onboarding                                                  |
| 22  | Onboarding Arthur Guedes                                                  |
| 29  | 1 Year Sponsorship for Tom Rohrer - Toms Tutorials                        |
| 31  | Onboarding Humberto Peres with 1 airdropped gnar                          |
| 35  | Salt Spring Slasher Sponsorship                                           |
| 36  | Maryhill Fall RVOD Freeride Sponsorship                                   |
| 42  | Rodrigo Panajotti Onboarding Proposal                                     |
| 46  | Onboarding Proposal Anderson do Santos                                    |
| 50  | Isaac Huston x Ephraim Sylar Onboarding Proposal                          |
| 53  | Sponsor Kampala Skateboard Initiative and Bring then Online and Onchain   |
| 61  | Bernardo Nassar renewal propososal V2 (Bodyboarder)                       |
| 63  | Dave Bachinsky » 1 Year Sponsorship Proposal                              |
| 70  | Sponsor Gnars Athlete Monik Santos to Compete in Brazil's Main Surf Event |
| 72  | Onboard Kanz and Ryan                                                     |
| 80  | ONBOARDING RAKI INTO GNARS COMMUNITY                                      |
| 85  | ONBOARDING VITOR RIBEIRO INTO GNARS COMMUNITY                             |
| 117 | Sponsor Gnars Monik Santos in QS/WSL 2026                                 |

**Sports covered:** Skateboarding (majority), Surfing, Bodyboarding, Freeride/Downhill, Content creation

**Geographies:** Brazil (dominant), Colombia, Uganda, Mexico, Portugal, USA

---

### 2. Event & Activation (13)

IRL events, skate sessions, hackathon presence, cultural activations funded by the DAO.

| #   | Title                                                             |
| --- | ----------------------------------------------------------------- |
| 2   | Lil Gnars (children skateboarding event, Rio)                     |
| 27  | PATINAJE TOTAL Y GNARS AT WRG 2024 ITALY                          |
| 30  | The Gnarving (auction mechanism activation)                       |
| 32  | Gnarly TPM Shredder Team (NGO surfer competition sponsorship)     |
| 39  | Gnars in DEVcon Thai Adventure (Bangkok documentary)              |
| 40  | Gnars Wakeboarding Culture                                        |
| 52  | Nico in GNARZARE Portugal V2 (big wave surf)                      |
| 64  | Shredding into DeSci: GNARS X BluntDAO x DeSCI World              |
| 69  | Gnars Japan (ski resort trip)                                     |
| 99  | Gnars Crew at Devconnect Buenos Aires 2025 – Skate + Hacker House |
| 101 | Gnars India Initiative: Building Bridges Through Skateboarding    |
| 108 | SKATE ACROSS AFRICA (EAST COAST - SOUTH COAST)                    |
| 110 | Gnargentina Tour                                                  |

**Recurring pattern:** Crypto conference presence (DEVcon Bangkok, Devconnect Buenos Aires) combined with skate/action sports content.

---

### 3. Physical Installation (10)

Permanent or semi-permanent physical structures: Noggles Rails, Nounstacles, skate park upgrades, DIY spots.

| #   | Title                                                                    |
| --- | ------------------------------------------------------------------------ |
| 4   | Refurbishment and maintenance at sopa de letras square (São Paulo)       |
| 20  | Fund the Creation of Nounstacles                                         |
| 25  | Sculpture NOGGLES RAIL at Medellin Colombia                              |
| 33  | Noggles Rail debut in London UK                                          |
| 38  | Retro ramp of Mexico can be gnarlier                                     |
| 41  | SKATE AND JAZZ - 1st Noggles Rail in Argentina                           |
| 68  | Noggles Rail in Milan - First in Italy                                   |
| 89  | Noggle Rail - Itapetininga Skate Park (Brazil)                           |
| 95  | Funding Katwe Parkour Culture to make the DIY Parkour Equipment (Uganda) |
| 104 | 7Capasmag Skate&Jazz Vol 2 - New Nounstacle inauguration in Devconnect   |

**Noggles Rail count (executed):** 6 confirmed (Medellin, London, Argentina, Milan, Itapetininga, + Devconnect inauguration)

**Geographies:** Brazil, Colombia, UK, Argentina, Italy, Uganda, Mexico

---

### 4. Content & Media (8)

Films, documentary series, media pods, magazine sponsorships, distribution rounds.

| #   | Title                                                                 |
| --- | --------------------------------------------------------------------- |
| 9   | Synopsis Skateboarding Film Proposal                                  |
| 16  | V2 Gnars Sunset IRL Docuseries Premiere Event                         |
| 26  | Establish the Pod Media                                               |
| 57  | Create a Round in Rounds.wtf for sharing Gnarly Media created in 2024 |
| 59  | Pod Media Proposal 2.0                                                |
| 76  | 7CAPAS MAGAZINE & GNARS                                               |
| 77  | THE GLOBAL PREMIERE OF UGANDA CONNECTION DOCUMENTARY                  |
| 97  | Pod Media Proposal 3.0                                                |

**Pod Media trajectory:** Proposals 26 → 59 → 97 show a recurring community media workstream (3 funded iterations).

---

### 5. Development & Tech (7)

Protocol upgrades, frontend development, infrastructure, tooling.

| #   | Title                                                         |
| --- | ------------------------------------------------------------- |
| 12  | Fund the Community and Tech Pods with Sendit                  |
| 45  | Launch a Comprehensive Gnars Community Platform               |
| 48  | Pay Millz and Bagelface for base migration and gnars frontend |
| 79  | Fix Metadata Renderer Base                                    |
| 86  | Gnars Flows (onchain tool by rocketman/riderway)              |
| 91  | IPFS Reimbursement and Advance for Shared IPFS Infrastructure |
| 93  | Gnars is BASED (Base chain branding/onchain initiative)       |

**Note:** Proposal 48 is the retroactive payment for the Base migration — the core infrastructure work that enabled the Base-chain DAO.

---

### 6. Droposal / NFT Drop (6)

On-chain NFT drop proposals (Zora/droposal mechanism) — typically cultural artifacts tied to DAO activities.

| #   | Title                                                            |
| --- | ---------------------------------------------------------------- |
| 47  | Droposal Uganda Connection                                       |
| 74  | Droposal Nogglesboard at the park                                |
| 81  | Droposal Uganda Connection Film                                  |
| 88  | Droposal: Noggles Delta: A Brief History of Nogglestacles in Rio |
| 98  | Dropossal 7Capas Mag Ska7e & Jazz 1st Noogles rail in Argentina  |
| 100 | Droposal - Surf is Up! Nogglesboard                              |

**Pattern:** Droposals often follow IRL activations (Uganda trip → droposal, Noggles Rail Argentina → droposal).

---

### 7. Travel & Reimbursement (4)

Travel grants and correction/reimbursement proposals.

| #   | Title                                                          |
| --- | -------------------------------------------------------------- |
| 28  | Travel Grant Proposal - IndoGNARS 2 (Indonesia surf content)   |
| 37  | Fund Travel Costs to Deliver Skateboarding Materials to Uganda |
| 65  | Reimbursement Proposal for Benbodhi                            |
| 90  | Transfer Correction – Proposal 70                              |

---

### 8. Community Partnerships (3)

External community integrations and co-branding.

| #   | Title                                                             |
| --- | ----------------------------------------------------------------- |
| 23  | Bring Thats Gnarly Onchain                                        |
| 24  | Make Bless The First Skateshop Gnarly                             |
| 71  | Our Pizza Gnar Turned into a Whale (PizzaDAO governance NFT swap) |

---

## Notable Patterns

**The Uganda Pipeline** — Multiple interconnected proposals: Uganda skateboarding materials delivery (#37) → Uganda Connection droposal (#47) → Isaac Huston x Ephraim Sylar onboarding (#50) → Kampala Skateboard Initiative sponsorship (#53) → Uganda Connection Film droposal (#81) → Global premiere (#77). A full community-building arc funded across 6+ proposals.

**Noggles Rails as flagship product** — 6 physical installations funded globally. London, Medellin, Argentina, Milan, Brazil (Itapetininga), + the original Nounstacles concept (#20). These are the most visible physical artifacts of the DAO.

**Pod Media recurring workstream** — Three funding rounds (#26, #59, #97) for ongoing video/media content production. Represents the closest thing Gnars has to a staffed editorial function.

**Athlete renewal cycle** — Some athletes have been funded multiple times (Dave Bachinsky: #5, #63; Bernardo Nassar: #19, #61; Monik Santos: #70, #117), establishing a renewal pattern.

**Crypto conference presence** — DEVcon Bangkok (#39), Devconnect Buenos Aires (#99), WRG 2024 Italy (#27), plus DeSci World (#64). Gnars consistently shows up at major crypto/developer events with action sports content.

**Brazil as largest geography** — Out of ~26 athlete proposals, a majority are Brazilian athletes. São Paulo skate scene (Estagirons, Arthur Guedes, Yan Felipe, Bruno Piu) is heavily represented.

---

## Risks / Constraints

- The `executed: true` filter only shows proposals that made it through the full queue-and-execute cycle. Some proposals that passed a vote may still be in queue or expired (none found in current snapshot).
- Proposal titles in the subgraph are often truncated or use shorthand — descriptions contain the actual scope.
- Proposal numbers are not sequential due to cancellations and retries (e.g., #10 canceled, #11 is Fernando Ferreira).

## Open Questions

- What is the total ETH value distributed per category? (Requires description parsing or on-chain calldata decoding)
- Which athletes are currently "active" vs past recipients?
- Is there a Snapshot (off-chain) proposal history that predates the Base migration? (`src/services/snapshot.ts` and `GNARS_ADDRESSES_ETH` suggest a previous Ethereum mainnet DAO)

## Recommendation

For website use:

1. The category breakdown (8 types) maps well to a "What We Fund" or "Impact" section on the About page.
2. Noggles Rails are the most photographable, shareable physical output — a map or gallery of all 6+ installations would be high-impact.
3. The Uganda arc and Pod Media recurring workstream are strong narrative threads for "community stories" content.
4. Athlete roster page could be built from onboarding proposals — 26 athletes funded, many with renewal patterns.
