"use client";

import { SectionHeader } from "@/components/common/SectionHeader";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";

/**
 * FAQ Section Component
 *
 * Displays frequently asked questions about Gnars DAO using an accordion interface.
 * Questions cover basic concepts, auctions, governance, and token mechanics.
 *
 * Features:
 * - Collapsible accordion items for better UX
 * - Comprehensive coverage of common questions
 * - Clear, concise answers
 */

const faqData = [
  {
    question: "What is a Gnar?",
    answer:
      "A Gnar is an on-chain membership NFT for the action-sports community. Each Gnar gives you a vote in Gnars DAO. Artwork is CC0 (public domain).",
  },
  {
    question: "What is Gnars DAO?",
    answer:
      "A community-owned action-sports brand funding athletes and creators via on-chain auctions and a shared treasury—now on Base.",
  },
  {
    question: "Where do auctions happen?",
    answer: "On Base. The DAO and treasury migrated to Base for cheaper, faster participation.",
  },
  {
    question: "How do auctions work?",
    answer:
      "New Gnars are auctioned continuously on-chain. Anyone can bid; the winner mints the Gnar and funds flow to the DAO treasury to back proposals.",
  },
  {
    question: "Who can own a Gnar, and what does it mean?",
    answer:
      "Anyone can win an auction or buy on secondary. Holding a Gnar equals one vote in Gnars DAO.",
  },
  {
    question: "Are Gnars free to use?",
    answer: "Yes. CC0—use, remix, commercialize, no permission needed.",
  },
  {
    question: "What kinds of projects does Gnars fund?",
    answer:
      "Athlete sponsorships, community infrastructure, creative media, and education/safety initiatives.",
  },
  {
    question: "Who created Gnars?",
    answer:
      "Launched by Nounish builders and action-sports enthusiasts; stewarded by Gnars DAO via on-chain governance.",
  },
  {
    question: "What happened to the old Ethereum (L1) Gnars?",
    answer: "L1 pieces remain as collectibles; governance and new drops are on Base.",
  },
  {
    question: "Where do I get $GNARS?",
    answer: "On Zora under the @gnars profile, Uniswap or Gnars website.",
  },
  {
    question: "What is $GNARS vs a Gnar?",
    answer:
      "$GNARS (Zora creator coin) is a liquid social token for the Gnars profile; a Gnar NFT gives DAO voting power. Different purposes—many hold both.",
  },
  {
    question: "How do I propose something for funding?",
    answer:
      "Hold 12 Gnars and submit a proposal through governance; the DAO votes and, if approved, funds it.",
  },
];

export function FAQ() {
  return (
    <Card>
      <SectionHeader
        title="Questions? Answers."
        description="Everything you need to know about Gnars DAO"
      />
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {faqData.map((item, index) => (
            <AccordionItem key={index} value={`item-${index}`}>
              <AccordionTrigger className="text-left cursor-pointer">
                <strong>{item.question}</strong>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{item.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
