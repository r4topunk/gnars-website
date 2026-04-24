"use client";

import { forwardRef, useEffect, useImperativeHandle } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm, useFormContext, useWatch } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  buildTemplateValidator,
  compileTemplate,
  getTemplateSchema,
  type BudgetRow,
  type TemplateValues,
} from "@/lib/proposal-template-schemas";
import { BudgetRepeater } from "./BudgetRepeater";
import { ProposalDetailsHeader } from "./ProposalDetailsHeader";
import type { ProposalFormValues } from "./schema";

export interface TemplateDetailsFormHandle {
  /** Validate all template fields. Returns true if valid; focuses first invalid field otherwise. */
  validate: () => Promise<boolean>;
}

export interface TemplateDetailsFormProps {
  slug: string;
}

export const TemplateDetailsForm = forwardRef<
  TemplateDetailsFormHandle,
  TemplateDetailsFormProps
>(function TemplateDetailsForm({ slug }, ref) {
  const schema = getTemplateSchema(slug);
  const parent = useFormContext<ProposalFormValues>();

  const initialValues = (parent.getValues("templateFields") as TemplateValues | undefined) ?? {};
  const templateForm = useForm<TemplateValues>({
    resolver: zodResolver(buildTemplateValidator(slug)),
    defaultValues: buildDefaults(slug, initialValues),
    mode: "onChange",
  });

  const watchedValues = useWatch({ control: templateForm.control }) as TemplateValues;

  useEffect(() => {
    if (!schema) return;
    parent.setValue("templateFields", watchedValues, { shouldDirty: true });
    const compiled = compileTemplate(slug, watchedValues);
    parent.setValue("description", compiled, { shouldDirty: true, shouldValidate: false });
  }, [watchedValues, slug, schema, parent]);

  useImperativeHandle(
    ref,
    () => ({
      validate: async () => {
        const ok = await templateForm.trigger();
        if (!ok) {
          const firstError = Object.keys(templateForm.formState.errors)[0];
          if (firstError) {
            templateForm.setFocus(firstError as keyof TemplateValues);
          }
        }
        return ok;
      },
    }),
    [templateForm],
  );

  if (!schema) return null;

  return (
    <FormProvider {...templateForm}>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-1">{schema.title}</h2>
          <p className="text-muted-foreground">
            Fill in the sections below. Your answers are compiled into the proposal.
          </p>
        </div>

        <ProposalDetailsHeader />

        <div className="space-y-5">
          {schema.fields.map((field) => {
            const error = templateForm.formState.errors[field.id] as
              | { message?: string }
              | undefined;
            return (
              <div key={field.id}>
                <Label htmlFor={field.id}>
                  {field.label}
                  {field.required ? " *" : ""}
                </Label>
                <p className="text-xs text-muted-foreground mt-1 mb-2">{field.helper}</p>
                {field.type === "textarea" ? (
                  <Textarea
                    id={field.id}
                    rows={field.rows ?? 4}
                    className="resize-y"
                    {...templateForm.register(field.id)}
                  />
                ) : (
                  <BudgetRepeater
                    name={field.id}
                    topLevelError={error?.message}
                    getRowError={(index) => {
                      const arrErrors = templateForm.formState.errors[field.id] as
                        | Record<
                            number,
                            {
                              label?: { message?: string };
                              amount?: { message?: string };
                            }
                          >
                        | undefined;
                      const rowErr = arrErrors?.[index];
                      if (!rowErr) return undefined;
                      return {
                        label: rowErr.label?.message,
                        amount: rowErr.amount?.message,
                      };
                    }}
                  />
                )}
                {field.type === "textarea" && error?.message ? (
                  <p className="text-xs text-red-500 mt-1">{error.message}</p>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </FormProvider>
  );
});

function buildDefaults(slug: string, existing: TemplateValues): TemplateValues {
  const schema = getTemplateSchema(slug);
  if (!schema) return existing;
  const defaults: TemplateValues = {};
  for (const field of schema.fields) {
    const existingVal = existing[field.id];
    if (field.type === "textarea") {
      defaults[field.id] = typeof existingVal === "string" ? existingVal : "";
    } else if (field.type === "budget") {
      defaults[field.id] = Array.isArray(existingVal) ? (existingVal as BudgetRow[]) : [];
    }
  }
  return defaults;
}
