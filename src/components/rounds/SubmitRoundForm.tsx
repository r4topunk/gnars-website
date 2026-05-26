"use client";

import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useActiveAccount } from "thirdweb/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createRoundActionMessage } from "@/features/rounds/signature";
import { getRoundState } from "@/features/rounds/state";
import type { Round } from "@/features/rounds/types";
import { useUserAddress } from "@/hooks/use-user-address";
import { Link } from "@/i18n/navigation";
import { RoundImageField } from "./RoundImageField";

const initialValues = {
  title: "",
  description: "",
  image: "",
  url: "",
};

export function SubmitRoundForm({
  round,
  databaseConfigured,
}: {
  round: Round;
  databaseConfigured: boolean;
}) {
  const { address, isConnected } = useUserAddress();
  const account = useActiveAccount();
  const [values, setValues] = useState(initialValues);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const state = getRoundState(round);
  const canSubmit =
    databaseConfigured &&
    state === "submissions_open" &&
    Boolean(
      isConnected && address && account && values.title && values.description && values.image,
    );

  const updateValue = (field: keyof typeof values, value: string) => {
    setMessage("");
    setValues((current) => ({ ...current, [field]: value }));
  };

  const submit = async () => {
    if (!canSubmit || !address || !account) return;

    setIsSubmitting(true);
    setMessage("");

    try {
      const path = `/api/rounds/${round.slug}/submit`;
      const payload = { walletAddress: address, submission: values };
      const issuedAt = new Date().toISOString();
      const messageToSign = createRoundActionMessage({
        action: "submit",
        method: "POST",
        path,
        walletAddress: address,
        payload,
        issuedAt,
      });
      const signature = await account.signMessage({ message: messageToSign });
      const response = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, issuedAt, signature }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Submission failed.");

      setValues(initialValues);
      setMessage("Submission received. It is visible on the round page.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Submission failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="container mx-auto max-w-3xl px-4 py-8">
      <div className="space-y-6">
        <Button asChild variant="ghost" className="px-0">
          <Link href={`/rounds/${round.slug}`}>
            <ArrowLeft className="size-4" />
            Back to {round.title}
          </Link>
        </Button>

        <section className="rounded-lg border border-border bg-muted/30 p-6 md:p-8">
          <h1 className="text-3xl font-bold tracking-tight">Submit to this round</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Add a project, clip, spot, or build idea for Gnars community voting.
          </p>
        </section>

        {!databaseConfigured && (
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-200">
            Configure the rounds database to enable submissions.
          </div>
        )}

        {state !== "submissions_open" && (
          <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
            This round is not accepting submissions right now.
          </div>
        )}

        <section className="space-y-5 rounded-lg border border-border bg-card p-6">
          {!isConnected && (
            <div className="rounded-md border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
              Connect the wallet that should be attached to this submission.
            </div>
          )}
          <div className="grid gap-5 md:grid-cols-2">
            <FormField
              label="Submission title"
              value={values.title}
              onChange={(value) => updateValue("title", value)}
              placeholder="DIY ledge session"
            />
            <FormField
              label="Project URL"
              value={values.url}
              onChange={(value) => updateValue("url", value)}
              placeholder="https://example.com"
            />
          </div>
          <RoundImageField
            label="Project image"
            value={values.image}
            onChange={(value) => updateValue("image", value)}
            placeholder="https://example.com/image.jpg"
          />
          <label className="block text-sm font-medium" htmlFor="round-submission-description">
            Description
          </label>
          <textarea
            id="round-submission-description"
            value={values.description}
            onChange={(event) => updateValue("description", event.target.value)}
            rows={7}
            className="w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            placeholder="Describe the work and why it belongs in this round."
          />
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button onClick={submit} disabled={!canSubmit || isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit project"}
            </Button>
            <Button variant="outline" onClick={() => setValues(initialValues)}>
              Reset
            </Button>
          </div>
          {message && <p className="text-sm text-muted-foreground">{message}</p>}
        </section>
      </div>
    </main>
  );
}

function FormField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  const id = `round-submission-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <Input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}
