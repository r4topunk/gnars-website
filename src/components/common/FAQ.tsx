"use client";

import { useTranslations } from "next-intl";
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

export function FAQ() {
  const t = useTranslations("home.faq");
  const items = t.raw("items") as Array<{ question: string; answer: string }>;

  return (
    <Card>
      <SectionHeader
        title={t("title")}
        description={
          <span>
            {t("descriptionPrefix")}{" "}
            <a
              href="https://gnars.center"
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-primary hover:text-primary/80"
            >
              {t("descriptionLink")}
            </a>
          </span>
        }
      />
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {items.map((item, index) => (
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
