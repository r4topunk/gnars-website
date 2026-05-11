## Translation tone brief (`docs/i18n/tone-brief.md`)

Subagents pass this brief to themselves and use it for every PT-BR string.

### Pronouns + register

- Use **`você`**, never `tu` (universal across Brazil).
- Default register: **informal, friendly, skater-adjacent**.
- Escalate to **formal/precise** in: governance flows (voting, delegation, treasury, transaction signing, error messages from chain), security-critical UI (wallet connection, key management, AA onboarding).
- Marketing/hero copy: leaning toward gírias when natural. The existing `é foda pra caralho!` line in `HOMEPAGE_DESCRIPTIONS` is in the target tone — don't sanitize that energy out.

### Web3 / DAO vocabulary (KEEP IN ENGLISH on both locales)

Even in PT-BR strings, leave these terms in English (Brazilian Web3 community uses them as English loanwords):

`mint`, `bid`, `propose`, `proposal`, `vote`, `delegate`, `delegation`, `gnar`, `gnars`, `droposal`, `wallet`, `gas`, `treasury`, `governance`, `auction`, `airdrop`, `swap`, `bridge`, `stake`, `claim`, `feed`, `coin`, `token`, `holder`, `whale`, `floor`, `op stack`, `base`.

Verbs ARE translated when used as plain action labels (e.g., button "Vote" → "Vote", but "Click Vote to cast your ballot" → "Clique em Vote para registrar seu voto"). When in doubt, keep the noun in English and translate the surrounding sentence.

### Specific term mapping

| English                  | PT-BR               | Notes                          |
| ------------------------ | ------------------- | ------------------------------ |
| Connect wallet           | Conectar wallet     | keep "wallet"                  |
| Place bid                | Dar bid             | keep "bid"                     |
| Create proposal          | Criar proposal      | keep "proposal"                |
| Vote against             | Votar contra        |                                |
| Vote for                 | Votar a favor       |                                |
| Abstain                  | Abster              |                                |
| Loading…                 | Carregando…         |                                |
| Something went wrong     | Algo deu errado     |                                |
| Not found                | Não encontrado      |                                |
| Empty / nothing here yet | Nada por aqui ainda |                                |
| Skater                   | Skatista            | OK to localize                 |
| Community                | Comunidade          |                                |
| Members                  | Membros             |                                |
| Treasury                 | Treasury            | keep English (governance term) |
| Coin proposal            | Coin proposal       | wizard label, keep English     |
| Onchain                  | Onchain             | keep                           |
| Mainnet / Base           | Mainnet / Base      | keep                           |

### Style rules

- Preserve emoji and punctuation exactly. Don't drop `!` or convert `—` to `-`.
- Don't introduce new emojis the English source didn't have.
- ICU plurals: PT-BR has `one` and `other` (no `=0`/`few`/`many`/etc. needed); use `{count, plural, =0 {…} one {…} other {…}}` when source uses `=0`.
- Sentence case for UI buttons and labels matching English casing convention.
- Capitalize proper nouns (Gnars, Base, Ethereum, Zora, Farcaster).
- Avoid Portuguese-Portugal phrasings (no `utilizador`, no `telemóvel`, no `ecrã`).

### Examples (showing the tone)

| EN                                 | PT-BR (good)                          | PT-BR (bad)                                     |
| ---------------------------------- | ------------------------------------- | ----------------------------------------------- |
| Place bid                          | Dar bid                               | Fazer um lance                                  |
| You don't have enough voting power | Você não tem poder de voto suficiente | O senhor não dispõe de poder de voto suficiente |
| Loading proposals…                 | Carregando proposals…                 | A carregar propostas…                           |
| No proposals yet                   | Nenhum proposal ainda                 | Não há propostas ainda                          |
| Connect to bid                     | Conecta a wallet pra dar bid          | Por favor, conecte sua carteira                 |
| Funding skate culture worldwide    | Bancando a cultura skate pelo mundo   | Financiando a cultura do skate mundialmente     |
