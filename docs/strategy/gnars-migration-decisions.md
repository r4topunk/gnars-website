# GNARS Migration — Decision Checklist

> Para revisar com Vlad antes de qualquer proposal on-chain ou trabalho tecnico.
> Marcar cada item com a decisao tomada e data.

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
- [ ] Duracao da janela de migracao: ______ dias/semanas
- [ ] O que acontece com tokens nao migrados apos a janela?
  - [ ] Queimados
  - [ ] Vao para treasury
  - [ ] Janela fica aberta indefinidamente
- [ ] Migracao em ondas ou tudo de uma vez?

### Snapshot (se aplicavel)
- [ ] Data/bloco do snapshot: ____________
- [ ] Quais tokens contam? (GNARS creator coin? content coins? NFTs?)
- [ ] Multiplicador: holdings x ______ (para igualar novo supply)

**Decisao:** ____________
**Data:** ____________

---

## 4. Criterios do Airdrop

**Pergunta central:** Quem recebe tokens alem dos holders atuais, e quanto?

### Categorias de contribuicao
- [ ] NFT holders (Gnars NFTs do auction)
- [ ] Content creators (Skatehive, droposals)
- [ ] Atletas patrocinados
- [ ] Builders/devs
- [ ] Votantes ativos em proposals
- [ ] Holders de tokens relacionados (sk hacker, etc.)
- [ ] Outras categorias? ____________

### Peso
- [ ] Formula de peso: ____________
  - Exemplos: NFTs held x tempo + proposals votadas + content criado
- [ ] Threshold minimo para qualificar: ____________
- [ ] Cap maximo por wallet: ____________

### Dados
- [ ] Onde buscar dados on-chain? (subgraph, Etherscan, Skatehive API)
- [ ] Dados off-chain contam? (contribuicoes no Discord/Telegram)
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
- [ ] Quantos content coins existem pareados com GNARS? ____________
- [ ] Qual o TVL aproximado? ____________
- [ ] Criadores mais afetados: ____________
- [ ] Precisamos comunicar individualmente com criadores?

**Decisao:** ____________
**Data:** ____________

---

## 6. Treasury Operations

**Pergunta central:** Como o treasury participa da migracao?

### Liquidez
- [ ] Quanto ETH do treasury para liquidez inicial no Clanker? ______ ETH
- [ ] Isso precisa de proposal separada? (envolve movimentacao de fundos)
- [ ] Quem executa o deposit de liquidez?

### Holdings atuais
- [ ] Treasury migra seus Zora coin holdings para o novo sistema?
- [ ] Treasury tem GNARS creator coins? Quanto? ____________
- [ ] Treasury tem content coins? Quais? ____________

### Autoridade operacional
- [ ] Tudo via proposal on-chain? (lento — ~2 semanas por operacao)
- [ ] Delegar autoridade temporaria para um multisig?
  - [ ] Se sim, quais signers? ____________
  - [ ] Com que limite de valor? ____________
  - [ ] Por quanto tempo? ____________

### Custos estimados
- [ ] Gas para deploy do novo token: ~______ ETH
- [ ] Gas para migracao/airdrop: ~______ ETH
- [ ] Liquidez inicial: ~______ ETH
- [ ] Total estimado: ~______ ETH
- [ ] Treasury tem saldo suficiente?

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
- [ ] Farcaster (post oficial)
- [ ] GM Farcaster (Jack ofereceu feature)
- [ ] Telegram group
- [ ] Website banner/popup
- [ ] Twitter/X
- [ ] Skatehive
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
