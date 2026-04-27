import Image from "next/image";

export function NogglesRailsInterludeImage() {
  return (
    <section className="py-2">
      <div className="overflow-hidden rounded-lg border bg-card">
        <div className="relative aspect-[16/9] w-full">
          <Image
            src="https://images.hive.blog/DQmSiGWQGT6aWc1jwDmZ3LvgjFdhvLxaD15Q7LwgH63xTjS/Captura%20de%20Tela%202026-04-27%20a%CC%80s%2011.06.39.png"
            alt="NogglesRails interlude"
            fill
            className="object-cover"
            unoptimized
          />
        </div>
      </div>
    </section>
  );
}
