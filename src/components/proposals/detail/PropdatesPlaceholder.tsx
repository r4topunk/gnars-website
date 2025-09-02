"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function PropdatesPlaceholder() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Propdates</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-muted-foreground">
          <p>Propdates functionality coming soon...</p>
          <p className="text-sm mt-2">This will show EAS-based proposal updates and community feedback</p>
        </div>
      </CardContent>
    </Card>
  );
}


