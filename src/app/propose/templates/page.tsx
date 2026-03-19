import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Camera,
  Code2,
  FileText,
  Hammer,
  Hexagon,
  Medal,
  Sparkles,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Proposal Templates — Gnars DAO",
  description:
    "Choose a template to draft your Gnars DAO proposal. Templates for athlete sponsorships, events, installations, content, development, and droposals.",
};

const TEMPLATES = [
  {
    slug: "athlete-sponsorship",
    title: "Athlete Sponsorship",
    description:
      "Onboard or renew a shredder — skate, surf, bodyboard, freeride. Define content commitments and milestones.",
    icon: Medal,
    sections: 6,
    color: "text-amber-500",
    bgAccent: "bg-amber-500/10 group-hover:bg-amber-500/15",
    borderAccent: "group-hover:border-amber-500/30",
    stats: "34% of passed proposals",
  },
  {
    slug: "event-activation",
    title: "Event & Activation",
    description:
      "Crypto conferences, skate sessions, hacker houses, cultural activations with content capture plans.",
    icon: Zap,
    sections: 6,
    color: "text-emerald-500",
    bgAccent: "bg-emerald-500/10 group-hover:bg-emerald-500/15",
    borderAccent: "group-hover:border-emerald-500/30",
    stats: "17% of passed proposals",
  },
  {
    slug: "physical-installation",
    title: "Physical Installation",
    description:
      "Noggles Rails, ramps, skate infrastructure, park refurbishments. Permanent physical presence worldwide.",
    icon: Hammer,
    sections: 6,
    color: "text-sky-500",
    bgAccent: "bg-sky-500/10 group-hover:bg-sky-500/15",
    borderAccent: "group-hover:border-sky-500/30",
    stats: "13% of passed proposals",
  },
  {
    slug: "content-media",
    title: "Content & Media",
    description:
      "Pod Media, documentaries, films, zines, photography. Creative production with distribution strategy.",
    icon: Camera,
    sections: 6,
    color: "text-rose-500",
    bgAccent: "bg-rose-500/10 group-hover:bg-rose-500/15",
    borderAccent: "group-hover:border-rose-500/30",
    stats: "10% of passed proposals",
  },
  {
    slug: "development",
    title: "Development & Tech",
    description:
      "Platform features, smart contracts, infrastructure, tooling. Open source by default.",
    icon: Code2,
    sections: 6,
    color: "text-violet-500",
    bgAccent: "bg-violet-500/10 group-hover:bg-violet-500/15",
    borderAccent: "group-hover:border-violet-500/30",
    stats: "9% of passed proposals",
  },
  {
    slug: "droposal",
    title: "Droposal / NFT Drop",
    description:
      "Commemorative NFT collections tied to IRL events, artist collabs, or community moments.",
    icon: Hexagon,
    sections: 6,
    color: "text-orange-500",
    bgAccent: "bg-orange-500/10 group-hover:bg-orange-500/15",
    borderAccent: "group-hover:border-orange-500/30",
    stats: "8% of passed proposals",
  },
] as const;

export default function TemplatesPage() {
  return (
    <div className="py-8">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
          <Link href="/propose" className="hover:text-foreground transition-colors">
            Create Proposal
          </Link>
          <span>/</span>
          <span className="text-foreground">Templates</span>
        </div>

        <h1 className="text-3xl font-bold tracking-tight">Proposal Templates</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl">
          Start from a proven structure. Each template is based on the 77 proposals
          that Gnars DAO has already funded — pick the one that fits your idea.
        </p>
      </div>

      {/* How It Works */}
      <div className="mb-8 rounded-xl border bg-card p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
          How it works
        </h2>
        <div className="grid gap-6 sm:grid-cols-3">
          <Step
            number={1}
            title="Pick a template"
            description="Choose the category that matches your proposal. Each has tailored sections and guidance."
          />
          <Step
            number={2}
            title="Fill in the sections"
            description="Replace the placeholder text with your project details. The structure keeps you on track."
          />
          <Step
            number={3}
            title="Add transactions & submit"
            description="Configure funding requests, then preview and submit your proposal on-chain."
          />
        </div>
      </div>

      {/* Template Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TEMPLATES.map((t) => {
          const Icon = t.icon;
          return (
            <Link key={t.slug} href={`/propose?template=${t.slug}`}>
              <Card
                className={`group relative h-full cursor-pointer border transition-all duration-200 hover:shadow-lg ${t.borderAccent}`}
              >
                <CardContent className="flex flex-col gap-4 p-5">
                  {/* Icon + Badge row */}
                  <div className="flex items-start justify-between">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors ${t.bgAccent}`}
                    >
                      <Icon className={`h-5 w-5 ${t.color}`} />
                    </div>
                    <Badge variant="secondary" className="text-[10px] font-semibold tabular-nums">
                      {t.sections} sections
                    </Badge>
                  </div>

                  {/* Title + Description */}
                  <div className="flex-1">
                    <h3 className="font-semibold leading-tight mb-1.5 group-hover:text-foreground">
                      {t.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {t.description}
                    </p>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-1 border-t border-border/50">
                    <span className="text-xs text-muted-foreground">{t.stats}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Blank Proposal Option */}
      <div className="mt-6">
        <Link href="/propose">
          <Card className="group cursor-pointer border-dashed transition-all duration-200 hover:border-foreground/20 hover:shadow-md">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted group-hover:bg-muted/80 transition-colors">
                <FileText className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold leading-tight mb-0.5">
                  Blank Proposal
                </h3>
                <p className="text-sm text-muted-foreground">
                  Start from scratch — no template, full creative freedom.
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Tips */}
      <div className="mt-6 flex flex-wrap gap-3">
        <Tip icon={Sparkles} text="Be specific about deliverables and timelines" />
        <Tip icon={Sparkles} text="Request milestones over lump-sum payments" />
        <Tip icon={Sparkles} text="Include links to past work or references" />
      </div>
    </div>
  );
}

function Step({
  number,
  title,
  description,
}: {
  number: number;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground text-background text-xs font-bold">
        {number}
      </span>
      <div>
        <h3 className="font-medium text-sm mb-1">{title}</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function Tip({ icon: Icon, text }: { icon: React.ComponentType<{ className?: string }>; text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-full border bg-card px-3 py-1.5">
      <Icon className="h-3 w-3 text-muted-foreground" />
      <span className="text-xs text-muted-foreground">{text}</span>
    </div>
  );
}
