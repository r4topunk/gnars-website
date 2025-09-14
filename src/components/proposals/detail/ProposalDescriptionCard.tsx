"use client";

import { Markdown } from "@/components/common/Markdown";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ProposalDescriptionCardProps {
  description: string;
}

export function ProposalDescriptionCard({ description }: ProposalDescriptionCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Description</CardTitle>
      </CardHeader>
      <CardContent>
        <Markdown>{description}</Markdown>
      </CardContent>
    </Card>
  );
}
