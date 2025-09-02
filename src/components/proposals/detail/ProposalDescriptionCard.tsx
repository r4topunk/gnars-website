"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Markdown } from "@/components/common/Markdown";

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


