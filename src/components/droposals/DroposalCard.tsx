"use client";

import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { DroposalListItem } from "@/services/droposals";

interface DroposalCardProps {
  item: DroposalListItem;
}

export function DroposalCard({ item }: DroposalCardProps) {
  const href = `/droposals/${item.proposalNumber}`;
  return (
    <Link href={href} className="group block">
      <Card className="overflow-hidden transition-transform group-hover:-translate-y-0.5">
        <CardContent>
          {item.bannerImage ? (
            <div className="relative aspect-[16/9] w-full bg-muted rounded-md overflow-hidden mb-4 border border-muted-foreground/10">
              <Image
                src={item.bannerImage}
                alt={item.name || item.title}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            </div>
          ) : (
            <div className="aspect-[16/9] w-full bg-muted" />
          )}
          <h3 className="line-clamp-1 font-semibold">{item.name || item.title}</h3>
          <div className="text-xs text-muted-foreground mt-1 flex items-center justify-between">
            <span>
              #{item.proposalNumber} · {new Date(item.createdAt).toLocaleDateString()}
            </span>
            {item.priceEth && (
              <span className="font-medium text-foreground">
                {Number(item.priceEth) === 0 ? "Free" : `${item.priceEth} ETH`}
              </span>
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
