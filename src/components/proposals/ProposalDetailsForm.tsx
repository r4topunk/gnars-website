"use client";

import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Eye } from "lucide-react";
import { useFormContext } from "react-hook-form";
import { Markdown } from "@/components/common/Markdown";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getTemplateSchema } from "@/lib/proposal-template-schemas";
import { ProposalDetailsHeader } from "./ProposalDetailsHeader";
import type { ProposalFormValues } from "./schema";
import { TemplateDetailsForm, type TemplateDetailsFormHandle } from "./TemplateDetailsForm";

export interface ProposalDetailsFormHandle {
  /** Validate the current details step. Branches on whether a template is active. */
  validate: () => Promise<boolean>;
}

export interface ProposalDetailsFormProps {
  templateSlug?: string | null;
}

export const ProposalDetailsForm = forwardRef<ProposalDetailsFormHandle, ProposalDetailsFormProps>(
  function ProposalDetailsForm({ templateSlug }, ref) {
    const { trigger } = useFormContext<ProposalFormValues>();
    const templateHandleRef = useRef<TemplateDetailsFormHandle | null>(null);
    const hasTemplate = Boolean(templateSlug && getTemplateSchema(templateSlug));

    useImperativeHandle(
      ref,
      () => ({
        validate: async () => {
          if (hasTemplate) {
            const templateOk = await templateHandleRef.current?.validate();
            if (!templateOk) return false;
            return trigger(["title"]);
          }
          return trigger(["title", "description"]);
        },
      }),
      [hasTemplate, trigger],
    );

    if (hasTemplate && templateSlug) {
      return (
        <TemplateDetailsForm
          ref={(handle) => {
            templateHandleRef.current = handle;
          }}
          slug={templateSlug}
        />
      );
    }

    return <MarkdownDetailsForm />;
  },
);

function MarkdownDetailsForm() {
  const t = useTranslations("propose");
  const {
    register,
    watch,
    formState: { errors },
  } = useFormContext<ProposalFormValues>();
  const [showMarkdownPreview, setShowMarkdownPreview] = useState(false);
  const watchedDescription = watch("description");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">{t("details.title")}</h2>
        <p className="text-muted-foreground">{t("details.description")}</p>
      </div>

      <ProposalDetailsHeader />

      <div>
        <div className="flex items-center justify-between mb-2">
          <Label htmlFor="description">{t("details.descriptionLabel")}</Label>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowMarkdownPreview(!showMarkdownPreview)}
          >
            <Eye className="h-4 w-4 mr-1" />
            {showMarkdownPreview ? t("details.edit") : t("details.preview")}
          </Button>
        </div>

        {showMarkdownPreview ? (
          <Card>
            <CardContent className="p-4 min-h-[200px]">
              {watchedDescription ? (
                <Markdown className="prose-sm max-w-none">{watchedDescription}</Markdown>
              ) : (
                <p className="text-muted-foreground italic">{t("details.noDescriptionYet")}</p>
              )}
            </CardContent>
          </Card>
        ) : (
          <Textarea
            id="description"
            placeholder={t("details.descriptionPlaceholder")}
            {...register("description")}
            rows={8}
            className="resize-none"
          />
        )}

        {errors.description && (
          <p className="text-xs text-red-500 mt-1">{errors.description.message}</p>
        )}
        <p className="text-xs text-muted-foreground mt-1">{t("details.descriptionHelper")}</p>
      </div>
    </div>
  );
}
