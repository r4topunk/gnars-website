"use client";

import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DroposalListItem } from "@/services/droposals";
import { Zap, Video } from "lucide-react";

interface DroposalCardProps {
  item: DroposalListItem;
}

export function DroposalCard({ item }: DroposalCardProps) {
  const href = `/droposals/${item.proposalNumber}`;
  return (
    <Link href={href} className="group block">
      <Card className="overflow-hidden transition-transform group-hover:-translate-y-0.5">
        {item.bannerImage ? (
          <div className="relative aspect-[16/9] w-full bg-muted">
            <Image
              src={item.bannerImage}
              alt={item.name || item.title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
            {typeof item.priceEth !== "undefined" && (
              <div className="absolute left-2 top-2 inline-flex items-center gap-1 rounded bg-background/80 px-2 py-1 text-xs backdrop-blur">
                <span className="font-medium text-foreground">
                  {Number(item.priceEth) === 0 ? "Free" : `${item.priceEth} ETH`}
                </span>
              </div>
            )}
            {item.animationUrl && (
              <div className="absolute top-2 right-2 inline-flex items-center gap-1 rounded bg-purple-600 px-2 py-1 text-xs text-white">
                <Video className="h-3 w-3" />
                Video
              </div>
            )}
          </div>
        ) : (
          <div className="aspect-[16/9] w-full bg-muted" />
        )}
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="line-clamp-1 font-semibold">{item.name || item.title}</h3>
            <Badge variant="secondary" className="inline-flex items-center gap-1">
              <Zap className="h-3 w-3" /> Droposal
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground mt-1 flex items-center justify-between">
            <span>#{item.proposalNumber} · {new Date(item.createdAt).toLocaleDateString()}</span>
            {item.priceEth && (
              <span className="font-medium text-foreground">{Number(item.priceEth) === 0 ? "Free" : `${item.priceEth} ETH`}</span>
            )}
          </div>
          {item.description && (
            <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{item.description}</p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}


