---
name: ptbr-verb-collisions
description: In PT-BR, claim/withdraw/harvest must stay three distinct verbs (resgatar/sacar/colher) — never collapse them all into "sacar"
metadata:
  type: feedback
---

When translating stake/rewards UI to PT-BR, `claim`, `withdraw` and `harvest` must map to three
distinct verbs: **claim → resgatar/resgate**, **withdraw → sacar/saque**, **harvest → colher**.
Do not let two of them land on "sacar".

**Why:** the user flagged that `messages/pt-br/stake.json` already has this collision in the
`lootbox` and `dlg` blocks (`claim` and `withdraw` both render "Sacar"), which makes two different
onchain actions indistinguishable in the UI. They explicitly asked not to reproduce it in new keys.
CLAUDE.md's glossary already says claim → resgate; the existing file drifted from it.

**How to apply:** any new PT-BR string in the stake/rewards area (and any future cleanup of the
existing `lootbox`/`dlg` keys). Also applies to derived nouns: "Falha no resgate" vs "Falha no saque".
Related: [[project-i18n-foundation]], `docs/i18n/tone-brief.md`.
