"use client";

import { useTranslations } from "next-intl";
import { Markdown } from "@/components/common/Markdown";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ProposalDescriptionCardProps {
  description: string;
}

export function ProposalDescriptionCard({ description }: ProposalDescriptionCardProps) {
  const t = useTranslations("proposals");
  // Strip the injected banner line added by createProposalAction so it doesn't
  // render twice (the banner is already shown via ProposalCard thumbnail).
  const withoutBanner = description.replace(/^!\[[^\]]*\]\([^)]+\)\n\n/, "");
  // Convert remaining ipfs:// URLs to a public gateway before rendering.
  // snapshot-proposals.json already uses SkateHive gateway for most images;
  // this is a fallback for any remaining ipfs:// references.
  const processedDescription = withoutBanner.replace(
    /!\[([^\]]*)\]\(ipfs:\/\/([a-zA-Z0-9]+)\)/g,
    (match, alt, cid) => `![${alt}](https://ipfs.skatehive.app/ipfs/${cid})`,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("detail.description")}</CardTitle>
      </CardHeader>
      <CardContent>
        <Markdown>{processedDescription}</Markdown>
      </CardContent>
    </Card>
  );
}
