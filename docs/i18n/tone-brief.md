## Translation tone brief (`docs/i18n/tone-brief.md`)

Subagents pass this brief to themselves and use it for every PT-BR string.

### Pronouns + register

- Use **`você`**, never `tu` (universal across Brazil).
- Default register: **informal, friendly, skater-adjacent**.
- Escalate to **formal/precise** in: governança flows (votação, delegação, tesouro, transaction signing, error messages from chain), security-critical UI (wallet connection, key management, AA onboarding).
- Marketing/hero copy: leaning toward gírias when natural. The existing `é foda pra caralho!` line in `HOMEPAGE_DESCRIPTIONS` is in the target tone — don't sanitize that energy out.

### Web3 / DAO vocabulary — translate vs. keep English

Translate to PT-BR (the Brazilian skate/DAO community already says these in Portuguese):

| English                 | PT-BR                | Notes                                          |
| ----------------------- | -------------------- | ---------------------------------------------- |
| proposal / proposals    | proposta / propostas | feminine; agree adjectives + articles          |
| propose (verb)          | propor               |                                                |
| bid (noun + verb)       | lance / dar lance    | "Place bid" → "Dar Lance"                      |
| auction / auctions      | leilão / leilões     | masculine                                      |
| treasury                | tesouro              | masculine                                      |
| governance              | governança           |                                                |
| delegation (noun)       | delegação            |                                                |
| delegate (verb)         | delegar / delegue    | imperative "Delegue" for instructions          |
| delegate (person, noun) | delegate             | **keep English** — column headers, list labels |
| claim (verb + noun)     | resgatar / resgate   | also covers bounty submissions                 |
| vote (verb + noun)      | votar / voto         |                                                |

Keep in English even inside PT-BR strings (BR Web3 community uses these as loanwords):

`mint`, `wallet`, `gas`, `gnar`, `gnars`, `droposal`, `token`, `coin`, `swap`, `bridge`, `stake`, `airdrop`, `feed`, `holder`, `whale`, `floor`, `snapshot`, `op stack`, `base`.

Verbs that derive from kept-English nouns: write them PT-style around the English root when natural — e.g. "mintar", "fazer swap", "dar stake". Don't force.

### Specific term mapping

| English                      | PT-BR               | Notes                             |
| ---------------------------- | ------------------- | --------------------------------- |
| Connect wallet               | Conectar wallet     | keep "wallet"                     |
| Place bid                    | Dar Lance           |                                   |
| Create proposal              | Criar Proposta      |                                   |
| Vote against                 | Votar contra        |                                   |
| Vote for                     | Votar a favor       |                                   |
| Abstain                      | Abster              |                                   |
| Loading…                     | Carregando…         |                                   |
| Something went wrong         | Algo deu errado     |                                   |
| Not found                    | Não encontrado      |                                   |
| Empty / nothing here yet     | Nada por aqui ainda |                                   |
| Skater                       | Skatista            | OK to localize                    |
| Community                    | Comunidade          |                                   |
| Members                      | Membros             |                                   |
| Treasury                     | Tesouro             |                                   |
| Governance                   | Governança          |                                   |
| Auction                      | Leilão              |                                   |
| Delegation                   | Delegação           |                                   |
| Coin proposal (wizard label) | Proposta de Coin    | translate "proposal", keep "coin" |
| Onchain                      | Onchain             | keep                              |
| Mainnet / Base               | Mainnet / Base      | keep                              |

### Style rules

- Preserve emoji and punctuation exactly. Don't drop `!` or convert `—` to `-`.
- Don't introduce new emojis the English source didn't have.
- ICU plurals: PT-BR has `one` and `other` (no `=0`/`few`/`many`/etc. needed); use `{count, plural, =0 {…} one {…} other {…}}` when source uses `=0`.
- Sentence case for UI buttons and labels matching English casing convention.
- Capitalize proper nouns (Gnars, Base, Ethereum, Zora, Farcaster).
- Avoid Portuguese-Portugal phrasings (no `utilizador`, no `telemóvel`, no `ecrã`).
- Gender agreement: `proposta` is feminine (a proposta, essa proposta, aprovada); `leilão` and `tesouro` are masculine (o leilão, esse tesouro, encerrado).

### Examples (showing the tone)

| EN                                 | PT-BR (good)                          | PT-BR (bad)                                     |
| ---------------------------------- | ------------------------------------- | ----------------------------------------------- |
| Place bid                          | Dar Lance                             | Fazer um lance / Dar bid                        |
| You don't have enough voting power | Você não tem poder de voto suficiente | O senhor não dispõe de poder de voto suficiente |
| Loading proposals…                 | Carregando propostas…                 | A carregar propostas… / Carregando proposals…   |
| No proposals yet                   | Nenhuma proposta ainda                | Não há propostas ainda / Nenhum proposal ainda  |
| Connect to bid                     | Conecta a wallet pra dar lance        | Por favor, conecte sua carteira                 |
| Funding skate culture worldwide    | Bancando a cultura skate pelo mundo   | Financiando a cultura do skate mundialmente     |
