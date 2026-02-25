"use client";

import { VotingPowerNotice } from "@/components/common/VotingControls";
import type { DelegatorWithCount } from "@/services/members";

const delegatorsSample: DelegatorWithCount[] = [
  { owner: "0xb2b7d66bb56ce8ff7838dc8053ff35050ed95e9d", tokenCount: 7 },
  { owner: "0xdfb6ed808fadddad9154f5605e349fff96e3d939", tokenCount: 4 },
  { owner: "0xdcf37d8aa17142f053aaa7dc56025ab00d897a19", tokenCount: 2 },
];

export default function VotingPowerNoticeDemoPage() {
  return (
    <main className="container mx-auto max-w-5xl py-8 space-y-8">
      <section className="space-y-2">
        <h1 className="text-2xl font-semibold">Voting Power Notice States</h1>
        <p className="text-sm text-muted-foreground">
          Visual preview of the vote info notice for different delegation and voting power scenarios.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">1. Self delegated with voting power</h2>
        <VotingPowerNotice
          isConnected
          votesLoading={false}
          votingPower={14n}
          delegatedToAnother={false}
          delegatedTo="0x4b5f934da25c33f130efc5df47c91af1375baa30"
          delegators={[]}
          delegatorsLoading={false}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">2. Delegated to another wallet</h2>
        <VotingPowerNotice
          isConnected
          votesLoading={false}
          votingPower={0n}
          delegatedToAnother
          delegatedTo="0x4b5f934da25c33f130efc5df47c91af1375baa30"
          delegators={[]}
          delegatorsLoading={false}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">3. Receiving delegations</h2>
        <VotingPowerNotice
          isConnected
          votesLoading={false}
          votingPower={33n}
          delegatedToAnother={false}
          delegatedTo="0xdfb6ed808fadddad9154f5605e349fff96e3d939"
          delegators={delegatorsSample}
          delegatorsLoading={false}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">4. Loading state</h2>
        <VotingPowerNotice
          isConnected
          votesLoading
          votingPower={0n}
          delegatedToAnother={false}
          delegatedTo="0x4b5f934da25c33f130efc5df47c91af1375baa30"
          delegators={[]}
          delegatorsLoading
        />
      </section>
    </main>
  );
}

