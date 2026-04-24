import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function NogglesRailsManifesto() {
  return (
    <section className="space-y-8 border-t py-12">
      <div className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-lg border bg-card p-6 text-card-foreground">
          <div className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
            1. Origins
          </div>
          <h2 className="mb-4 text-2xl font-bold tracking-tight">Where it started</h2>
          <div className="space-y-4 text-sm leading-7 text-muted-foreground md:text-base">
            <p>
              Everything started years ago with a simple but radical proposal by Pharra and Vlad
              (sktbrd) from the XV Collective. The idea was clear: build skate obstacles rooted in
              DIY culture, open-source thinking, and real street energy, later becoming one of the
              earliest onchain-born physical experiments within Gnars DAO.
            </p>
            <p>
              Take a look at this documentary, where the creator explains the origins of the project
              and the launch of the NogglesDELTA.
            </p>
            <p>
              <Link
                href="https://www.gnars.com/droposals/88"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-foreground underline underline-offset-4 hover:text-foreground/80"
              >
                Full Doc Here
              </Link>
            </p>
          </div>
        </article>

        <article className="rounded-lg border bg-card p-6 text-card-foreground">
          <div className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
            2. Open-Source as a Weapon
          </div>
          <h2 className="mb-4 text-2xl font-bold tracking-tight">Build it anywhere</h2>
          <div className="space-y-4 text-sm leading-7 text-muted-foreground md:text-base">
            <p>
              One of the first Gnars droposals was an open-source PDF created by Pharra,
              documenting how to build a Nogglesrail. This document enabled replication across
              cities and countries, turning a single idea into a global, permissionless skate
              infrastructure.
            </p>
            <p>
              <Link
                href="https://drive.google.com/drive/folders/1MwAEBKHuFhgDB7HrI1PjMSNq5wkPDvLB"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-foreground underline underline-offset-4 hover:text-foreground/80"
              >
                Open-Source Build Files
              </Link>
            </p>
          </div>
        </article>
      </div>

      <article className="rounded-lg border bg-card p-6 text-card-foreground">
        <div className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
          3. Variations & Experiments
        </div>
        <div className="mb-6 overflow-hidden rounded-lg border">
          <div className="relative aspect-[16/7] w-full">
            <Image
              src="https://img.paragraph.com/cdn-cgi/image/format=auto,width=1200,quality=85/https://storage.googleapis.com/papyrus_images/87e8297dbb18991c60288e0d89bd9222395c0c123b3ded7ecd0684f5b9f96df1.png"
              alt="Noggles variations and experiments"
              fill
              className="object-cover"
              unoptimized
            />
          </div>
        </div>
        <h2 className="mb-4 text-2xl font-bold tracking-tight">Beyond the first rails</h2>
        <p className="text-sm leading-7 text-muted-foreground md:text-base">
          Following the creation of the first Noggles Rails, the expansion of Noggles presence into
          additional action sports became inevitable, evolving beyond traditional skate handrails
          into a broader modular obstacle system.
        </p>
        <p className="mt-4 text-sm leading-7 text-muted-foreground md:text-base">
          This led to the development of fully branded Noggles wakeboard ramps, Megaramp and
          Thrasher Mag, a snowboard grind tube deployed in Japan, the Noggles Delta selected through
          an onchain Gnars DAO vote among four proposed obstacle models, and other activations that
          further nounified physical infrastructure, translating decentralized consensus into
          tangible cultural impact.
        </p>
      </article>

      <div className="border-t pt-8 text-center">
        <p className="mx-auto max-w-lg text-muted-foreground">
          Want to bring a NogglesRail to your city? Submit a proposal and the community will fund it.
        </p>
        <Button asChild className="mt-4">
          <Link href="/propose">Submit a Proposal</Link>
        </Button>
      </div>
    </section>
  );
}
