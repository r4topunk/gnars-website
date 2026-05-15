"use client";

import { useTranslations } from "next-intl";
import { Markdown } from "@/components/common/Markdown";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ProposalDescriptionCardProps {
  description: string;
}

export function ProposalDescriptionCard({ description }: ProposalDescriptionCardProps) {
  const t = useTranslations("proposals");
  // Convert IPFS URLs in markdown before rendering
  // Note: snapshot-proposals.json already uses SkateHive gateway for most images
  // This is a fallback for any remaining ipfs:// URLs
  const processedDescription = description.replace(
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
