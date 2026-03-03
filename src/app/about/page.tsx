import type { Metadata } from "next";
import Link from "next/link";
import { DAO_CONFIG } from "@/lib/dao-config";

export const metadata: Metadata = {
  title: DAO_CONFIG.about.metaTitle,
  description: DAO_CONFIG.about.metaDescription,
  alternates: {
    canonical: "/about",
  },
};

export default function AboutPage() {
  return (
    <div className="py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="text-4xl font-bold tracking-tight">{DAO_CONFIG.about.title}</h1>

        {DAO_CONFIG.about.sections.map((section, index) => (
          <div key={index}>
            {section.heading && (
              <h2 className="text-2xl font-semibold">{section.heading}</h2>
            )}
            <p className="text-muted-foreground">{section.content}</p>
          </div>
        ))}

        <div className="flex flex-wrap gap-4">
          <Link href="/" className="text-foreground underline underline-offset-4">
            Home
          </Link>
          <Link href="/proposals" className="text-foreground underline underline-offset-4">
            Proposals & grants
          </Link>
          <Link href="/auctions" className="text-foreground underline underline-offset-4">
            Auctions supporting skate culture
          </Link>
        </div>
      </div>
    </div>
  );
}
