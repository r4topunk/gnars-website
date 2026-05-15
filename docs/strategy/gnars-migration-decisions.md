# GNARS Migration — Decision Checklist

> Para revisar com Vlad antes de qualquer proposal on-chain ou trabalho tecnico.
> Marcar cada item com a decisao tomada e data.

## Estado Atual (on-chain, 2026-04-06)

### Token GNARS atual (Zora Creator Coin on Base)
- **Endereco:** `0x0cf0c3b75d522290d7d12c74d7f1f0cc47ccb23b`
- **Symbol:** gnars | **Decimals:** 18
- **Supply total:** 1,000,000,000 (1B)
- **Treasury holds:** 562,256 GNARS (~0.056% do supply)

### Gnars NFTs (Builder DAO)
- **Endereco:** `0x880fb3cf5c6cc2d7dfc13a993e839a9411200c17`
- **Total minted:** 6,001 NFTs

### Treasury (Base: `0x72ad986ebac0246d2b3c565ab2a1ce3a14ce6f88`)
| Asset | Quantidade |
|-------|-----------|
| ETH | 6.77 |
| USDC | 15,496.24 |
| WETH | 0.03 |
| SENDIT | 474,092,938 |
| GNARS ERC20 | 562,256 |

### Content Coins (GNARS-paired)
- **Subgraph Goldsky:** OFFLINE (404) — precisa redeploy
- **Contagem exata de coins:** indisponivel sem subgraph; dados vem via Zora SDK no runtime

### Contratos do DAO (Base)
| Contrato | Endereco |
|----------|----------|
| Governor | `0x3dd4e53a232b7b715c9ae455f4e732465ed71b4c` |
| Treasury | `0x72ad986ebac0246d2b3c565ab2a1ce3a14ce6f88` |
| Auction | `0x494eaa55ecf6310658b8fc004b0888dcb698097f` |
| Metadata | `0xdc9799d424ebfdcf5310f3bad3ddcce3931d4b58` |
| Lootbox V4 | `0xc934804520ccc172909a093bae5bb07188e77cb2` |

### Governance (historico)
- **~119 proposals** on-chain, **77 executadas**
- **Timing:** ~2 dias voting delay + ~5 dias voting period + timelock
- **Tipos de proposal existentes:** send-eth, send-usdc, send-tokens, send-nfts, buy-coin, droposal, custom

---

## 1. Aprovar a Migracao

**Pergunta central:** A DAO autoriza migrar o token GNARS de Zora para Clanker?

- [ ] Concordamos que Zora nao atende mais as necessidades do projeto?
- [ ] Concordamos que Clanker e o ecossistema certo para migrar?
- [ ] Temos confianca suficiente no Clanker (imutabilidade, independencia dos tokens)?
- [ ] Quem redige a proposal on-chain? ____________
- [ ] Qual o framing da justificativa? (tecnico? estrategico? financeiro?)

**Decisao:** ____________
**Data:** ____________

---

## 2. Token Economics

**Pergunta central:** Quais sao os parametros do novo token GNARS?

### Supply
- [ ] Total supply: 100B (conforme call) ou outro valor? ____________
  - **Contexto:** Supply atual do GNARS Zora = 1B. Clanker padrao = 100B. Multiplicador = 100x.
- [ ] Justificativa para o supply escolhido: ____________

### Distribuicao
- [ ] % para holders existentes (migracao direta): ______%
- [ ] % para airdrop por contribuicao: ______%
- [ ] % para vault/treasury reserve: ______%
- [ ] % para operacoes/equipe (se houver): ______%
- [ ] % para liquidez inicial no Clanker: ______%
- [ ] Soma = 100%? ______

### Pairing Asset
- [ ] Par com ETH? (Jack sugeriu — "cold hard cash" para criadores)
- [ ] Par com GNARS? (mantem mecanica atual — cada buy de content coin compra GNARS)
- [ ] Par com USDC? (estavel, menos volatilidade)
- [ ] Outro? ____________
- [ ] Podemos mudar o par depois ou e permanente no Clanker?

### Fee Structure
- [ ] Qual % de fee no pool? ____________
- [ ] Fees vao para onde? (treasury? burn? stakers?)
- [ ] Fee no token pareado ou no GNARS?

**Decisao:** ____________
**Data:** ____________

---

## 3. Metodo de Migracao

**Pergunta central:** Como holders trocam tokens antigos pelos novos?

### Metodo
- [ ] Compre migration tool (preferido na call — deposit old → receive new)
- [ ] Snapshot + airdrop (mais simples, mas menos controle)
- [ ] Hibrido (snapshot para holders pequenos, tool para holders grandes)

### Parametros
- [ ] Ratio de troca: 1 old GNARS = ______ new GNARS
  - **Se 100B/1B:** ratio natural = 100:1 (cada 1 GNARS antigo = 100 novos)
- [ ] Duracao da janela de migracao: ______ dias/semanas
- [ ] O que acontece com tokens nao migrados apos a janela?
  - [ ] Queimados
  - [ ] Vao para treasury
  - [ ] Janela fica aberta indefinidamente
- [ ] Migracao em ondas ou tudo de uma vez?

### Snapshot (se aplicavel)
- [ ] Data/bloco do snapshot: ____________
- [ ] Quais tokens contam? (GNARS creator coin? content coins? NFTs?)
  - **GNARS ERC20:** `0x0cf0c3b75d522290d7d12c74d7f1f0cc47ccb23b` (1B supply, 18 decimals)
  - **Gnars NFTs:** `0x880fb3cf5c6cc2d7dfc13a993e839a9411200c17` (6,001 minted)
  - **Content coins:** quantidade exata indisponivel (subgraph offline)
- [ ] Multiplicador: holdings x ______ (para igualar novo supply)
  - **Se 100B/1B:** multiplicador = 100

**Decisao:** ____________
**Data:** ____________

---

## 4. Criterios do Airdrop

**Pergunta central:** Quem recebe tokens alem dos holders atuais, e quanto?

### Categorias de contribuicao
- [ ] NFT holders (Gnars NFTs do auction) — **6,001 NFTs existem, dados via Builder subgraph**
- [ ] Content creators (Skatehive, droposals) — **dados via Skatehive API + 6 droposals executadas**
- [ ] Atletas patrocinados — **26 proposals de sponsorship executadas (34% do total)**
- [ ] Builders/devs — **7 proposals de dev/tech executadas**
- [ ] Votantes ativos em proposals — **dados on-chain via Governor contract**
- [ ] Holders de tokens relacionados (sk hacker, etc.) — **mencionado por Vlad na call**
- [ ] Outras categorias? ____________

### Peso
- [ ] Formula de peso: ____________
  - Exemplos: NFTs held x tempo + proposals votadas + content criado
  - **Dados disponiveis on-chain:** NFT holdings (subgraph), votes (Governor events), proposals criadas
  - **Dados off-chain necessarios:** Skatehive posts, contribuicoes comunitarias
- [ ] Threshold minimo para qualificar: ____________
- [ ] Cap maximo por wallet: ____________

### Dados
- [ ] Onde buscar dados on-chain?
  - **Builder subgraph:** NFT holders, proposals, votes — `api.goldsky.com/.../nouns-builder-base-mainnet/latest/gn`
  - **Governor contract:** `0x3dd4e53a232b7b715c9ae455f4e732465ed71b4c` — VoteCast events
  - **GNARS ERC20:** `0x0cf0c3b75d522290d7d12c74d7f1f0cc47ccb23b` — Transfer events para snapshot de holders
  - **Eth mainnet subgraph:** `api.studio.thegraph.com/query/84885/gnars-mainnet/v1.0.0` — dados historicos pre-Base
- [ ] Dados off-chain contam? (contribuicoes no Discord/Telegram/Skatehive)
- [ ] Quem valida a lista final antes do airdrop?

**Decisao:** ____________
**Data:** ____________

---

## 5. Content Coins Existentes na Zora

**Pergunta central:** O que fazemos com os content coins que ja existem pareados com GNARS na Zora?

### Opcoes
- [ ] **Manter na Zora** — funcionam independente, criadores mantem valor
- [ ] **Tool de agregacao** — criadores trocam Zora coins → novo GNARS (ideia do Vlad na call)
- [ ] **Snapshot + airdrop equivalente** — snapshot dos holders de content coins, airdrop no Clanker
- [ ] **Depreciar** — fresh start, sem migracao de content coins
- [ ] **Hibrido** — manter na Zora mas novos coins so no Clanker

### Impacto
- [ ] Quantos content coins existem pareados com GNARS? **Subgraph offline (Goldsky 404). Precisa redeploy ou query via Zora SDK para contar.**
- [ ] Qual o TVL aproximado? **Indisponivel sem subgraph. Zora SDK retorna marketCap e volume por coin.**
- [ ] Criadores mais afetados: **Allowlist conhecida: skatehacker (Vlad), nogenta. Demais precisam de query.**
- [ ] Precisamos comunicar individualmente com criadores?

**Decisao:** ____________
**Data:** ____________

---

## 6. Treasury Operations

**Pergunta central:** Como o treasury participa da migracao?

### Liquidez
- [ ] Quanto ETH do treasury para liquidez inicial no Clanker? ______ ETH
  - **Disponivel:** 6.77 ETH + 15,496 USDC (~total ~$28k USD assumindo ETH ~$1,800)
- [ ] Isso precisa de proposal separada? (envolve movimentacao de fundos) — **SIM, qualquer send-eth/send-usdc requer proposal**
- [ ] Quem executa o deposit de liquidez?

### Holdings atuais
- [ ] Treasury migra seus Zora coin holdings para o novo sistema?
- [ ] Treasury tem GNARS creator coins? **SIM — 562,256 GNARS (~0.056% do 1B supply)**
- [ ] Treasury tem content coins? **Precisa query via Zora SDK (`getProfileBalances`)**

### Autoridade operacional
- [ ] Tudo via proposal on-chain? (lento — ~2 semanas por operacao)
  - **Fluxo atual:** proposal → 2 dias delay → 5 dias voting → timelock → execute
  - **Tipo "custom" existe** e permite calldata arbitrario — pode ser usado para operacoes de migracao
- [ ] Delegar autoridade temporaria para um multisig?
  - [ ] Se sim, quais signers? ____________
  - [ ] Com que limite de valor? ____________
  - [ ] Por quanto tempo? ____________

### Custos estimados
- [ ] Gas para deploy do novo token: ~______ ETH (**Base gas e barato, ~$0.01-0.10 por tx**)
- [ ] Gas para migracao/airdrop: ~______ ETH (**depende do numero de holders — batch com Multicall3 possivel**)
- [ ] Liquidez inicial: ~______ ETH
- [ ] Total estimado: ~______ ETH
- [ ] Treasury tem saldo suficiente? **6.77 ETH + 15,496 USDC disponiveis. Gas nao e problema no Base. A questao e quanto alocar para liquidez.**

**Decisao:** ____________
**Data:** ____________

---

## 7. Comunicacao

**Pergunta central:** Como e quando comunicamos para a comunidade?

### Timeline
- [ ] **Pre-anuncio** (teaser) — quando? ____________
- [ ] **Anuncio oficial** (detalhes completos) — quando? ____________
- [ ] **Proposal on-chain** — quando? ____________
- [ ] **Inicio da migracao** — quando? ____________
- [ ] **Fim da janela** — quando? ____________

### Canais
- [ ] Farcaster (post oficial) — **ja usado pela comunidade**
- [ ] GM Farcaster (Jack ofereceu feature) — **conta branded do Farcaster no X, boa distribuicao**
- [ ] Telegram group — **Jack criou grupo na call (Vlad, r4to, Jack, + Compre)**
- [ ] Website banner/popup — **gnars.com, podemos implementar**
- [ ] Twitter/X
- [ ] Skatehive — **comunidade organica ativa, posts monetizados**
- [ ] Outros? ____________

### Mensagem
- [ ] Quem redige o texto principal? ____________
- [ ] Jack ajuda com comms? (ofereceu na call)
- [ ] FAQ pronto antes do anuncio?
- [ ] Instrucoes passo-a-passo para holders?
- [ ] Video explicativo?

### Tom
- [ ] Positivo (upgrade, novo ecossistema, mais oportunidades)
- [ ] Transparente (problemas com Zora, motivos da mudanca)
- [ ] Urgente (migrem agora) vs calmo (temos tempo, sem pressa)

**Decisao:** ____________
**Data:** ____________

---

## Resumo de Decisoes

| # | Decisao | Resposta | Data |
|---|---------|----------|------|
| 1 | Aprovar migracao | | |
| 2 | Token economics | | |
| 3 | Metodo de migracao | | |
| 4 | Criterios do airdrop | | |
| 5 | Content coins Zora | | |
| 6 | Treasury ops | | |
| 7 | Comunicacao | | |

---

## Proximo Passo

Depois de preencher este doc com Vlad:
1. Bundlar decisoes 1-3 em uma Migration Authorization Proposal
2. Postar proposal on-chain
3. Enquanto voto rola (~2 semanas), avancar pesquisa tecnica em paralelo
