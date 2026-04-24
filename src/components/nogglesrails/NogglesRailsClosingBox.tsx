import { NounstacleDefinition } from "./NounstacleDefinition";
import Image from "next/image";

export function NogglesRailsClosingBox() {
  return (
    <section className="space-y-8 border-t py-12">
      <article className="rounded-lg border bg-card p-6 text-card-foreground">
        <div className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
          3. Variations & Experiments
        </div>
        <div className="mb-6 overflow-hidden rounded-lg border bg-black/20 p-2">
          <div className="relative aspect-[16/9] w-full">
            <Image
              src="https://img.paragraph.com/cdn-cgi/image/format=auto,width=1200,quality=85/https://storage.googleapis.com/papyrus_images/87e8297dbb18991c60288e0d89bd9222395c0c123b3ded7ecd0684f5b9f96df1.png"
              alt="Noggles variations and experiments"
              fill
              className="object-contain"
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

      <article className="rounded-lg border bg-card p-6 text-card-foreground">
        <div className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
          4. Still Rolling
        </div>
        <h2 className="mb-4 text-2xl font-bold tracking-tight">Onchain-born, still alive</h2>
        <p className="text-sm leading-7 text-muted-foreground md:text-base">
          Nogglesrails or Nounstacles prove that onchain coordination can materialize into
          "concrete", skateable infrastructure. Through cash for tricks, events, exposition, Gnars
          contests, viral Instagram clips, and global replication, the project keeps the DIY spirit
          alive while spreading Noggles culture in a way no traditional brand or institution could.
          This is an onchain-born project by Gnars DAO and it’s still alive bro, still rolling, and
          still being built.
        </p>

        <NounstacleDefinition />
      </article>
    </section>
  );
}
