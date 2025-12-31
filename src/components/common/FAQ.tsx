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
    question: "What is Gnars DAO?",
    answer:
      "Gnars is a community-owned action-sports brand. Instead of an individual or small marketing team deciding what gets funded behind a closed budget, decisions are made collectively and in public. Gnars also explores innovative ways to fund athletes and sustain its community by applying cutting-edge blockchain technology to the action-sports world—now on Base.",
  },
  {
    question: "How do auctions work?",
    answer:
      "New Gnars are auctioned continuously onchain. Anyone can bid; the winner mints the Gnar and funds flow to the DAO treasury to back proposals.",
  },
  {
    question: "Are Gnars artwork free to use?",
    answer: "Yes. CC0—use, remix, commercialize, no permission needed.",
  },
  {
    question: "What kinds of projects does Gnars Dao funds?",
    answer:
      "Community infrastructure, creative media, tooling creation, sales partnerships, education initiatives and others",
  },
  {
    question: "What happened to the old Ethereum (L1) Gnars?",
    answer: "Nothing, they are fucking dope and still exist!",
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
  {
    question: "How do I participate in Gnar TV?",
    answer:
      "Use /create-coin page to create a creator coin on Zora, then mint a video and hold 300k $Gnars in your wallet",
  },
];

export function FAQ() {
  return (
    <Card>
      <SectionHeader
        title="F.A.Q."
        description={
          <span>
            For deeper dive visit{" "}
            <a
              href="https://gnars.center"
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-primary hover:text-primary/80"
            >
              gnars.center
            </a>
          </span>
        }
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
