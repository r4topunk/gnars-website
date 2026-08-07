# Message to @kompreni — the swap-and-deposit entrypoint ask

Context for the DM / cast. Paste-ready below the line.

---

gm! Wiring the /migrate flow into the Upgrader and hit the one thing that needs you.

**The problem:** our page batch-swaps people's Zora dust into ETH or old $gnars. If those
proceeds land in the user's wallet, they can just take the ETH and never enter — we'd be
running a free public batch-swap, not a presale. We want the swap output to go **straight
into your Upgrader deposit atomically**, so the only way out is claiming new $gnars.

**The ask (you own the Upgrader + run the router, so it's cleanest on your side):**

1. **A swap-and-deposit entrypoint** — one call that takes the incoming ETH/WETH (or the
   swap output) and credits `deposit(id, msg.sender, …)` in the same tx, reading the
   received amount so we don't have to know the post-swap amount in advance. That makes the
   whole thing atomic: dust → proceeds → deposited, no wallet intermediate.
   - If simpler on your end: a plain **`depositETH(id) payable`** that wraps to WETH and
     credits `msg.sender` works too — we do the dust→ETH swap in the same batched tx and
     pipe the ETH straight in.

2. **The upgrade `id`** for our migration (the `schedule(...)` id / coinId). You said you'd
   register closer to launch — whenever it exists, send it and we wire deposit/claim to it.

3. **Confirm the deposit lanes + signature:** WETH `0x4200000000000000000000000000000000000006`
   for the ETH lane, old $gnars `0x0cf0c3b75d522290d7d12c74d7f1f0cc47ccb23b` for the migration
   lane. And the exact `deposit(...)` sig — we have `deposit(id, user, token, amount, bool)`;
   what's the bool (donation)?

4. **Partial-fill handling** for the thin-pool case (the ~67%-stuck behavior from upgrade #2)
   — how are leftovers returned/handled? This is the fairness point and the main reason we're
   pushing the ETH lane.

5. **Params to lock:** 1% swap fee, 30% to treasury → founder-vault beneficiary =
   `0xBe6C3D651d2F6e9eFA562b5a7CDf411304cad076` (temp DAO multisig), 7-day vesting. Confirm or
   adjust.

6. **Claim:** confirm `claim(id, user)` after you `execute`, and that we can self-host the
   deposit/claim UI on gnars.com against `0x999Cd4Dcb412A8272a62BeeB271662d1C72d3c7e`.

Everything else — the batch-swap UI, routing, quotes, the two lanes, copy, the gated deposit
card — is built and waiting. The moment you send the entrypoint + id, it's plug-and-play on
our side. 🙏
