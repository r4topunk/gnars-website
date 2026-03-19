"use client";

import { useMemo } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { NOGGLES_RAILS } from "@/content/nogglesrails";

export default function NogglesRailsHero() {
  const stats = useMemo(() => {
    const countries = new Set(NOGGLES_RAILS.map((r) => r.country));
    const continents = new Set(NOGGLES_RAILS.map((r) => r.continent));
    return [
      { value: NOGGLES_RAILS.length, label: "Installations" },
      { value: countries.size, label: "Countries" },
      { value: continents.size, label: "Continents" },
    ];
  }, []);

  return (
    <section className="py-8 md:py-10 lg:py-12">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
        {/* Left — text */}
        <div className="flex flex-col justify-center space-y-6">
          <div className="space-y-3">
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
              NogglesRails
            </h1>
            <p className="text-lg text-muted-foreground md:text-xl">
              Community-funded skate rails installed in spots around the world.
              Open, CC0, owned by no one and everyone.
            </p>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6">
            {stats.map(({ value, label }) => (
              <div key={label} className="flex flex-col">
                <span className="text-2xl font-bold">{value}</span>
                <span className="text-sm text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() =>
                document.getElementById("map")?.scrollIntoView({ behavior: "smooth" })
              }
            >
              Explore Map
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                document.getElementById("rails")?.scrollIntoView({ behavior: "smooth" })
              }
            >
              View All Rails
            </Button>
          </div>
        </div>

        {/* Right — image */}
        <div className="flex items-center justify-center">
          <Image
            src="/nogglesRail3D.png"
            alt="NogglesRail 3D"
            width={300}
            height={300}
            className="drop-shadow-lg"
            priority
          />
        </div>
      </div>
    </section>
  );
}
