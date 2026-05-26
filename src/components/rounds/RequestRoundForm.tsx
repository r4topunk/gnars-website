"use client";

import { useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useActiveAccount } from "thirdweb/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createRoundActionMessage } from "@/features/rounds/signature";
import type {
  RoundAwardInput,
  RoundRequestInput,
  RoundVotingStrategy,
} from "@/features/rounds/types";
import { normalizeRoundRequestSlug } from "@/features/rounds/validation";
import { useUserAddress } from "@/hooks/use-user-address";
import { Link } from "@/i18n/navigation";
import { RoundImageField } from "./RoundImageField";

type RequestFormValues = Omit<RoundRequestInput, "awards"> & {
  awards: RoundAwardInput[];
};

const initialValues = (): RequestFormValues => {
  const now = new Date();
  const votingStart = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const votingEnd = new Date(votingStart.getTime() + 7 * 24 * 60 * 60 * 1000);

  return {
    walletAddress: "",
    requesterName: "",
    requesterEmail: "",
    requestedSlug: "",
    title: "",
    description: "",
    content: "",
    image: "",
    url: "",
    timeline: "",
    submissionsOpenAt: toDateTimeLocal(now),
    votingStartsAt: toDateTimeLocal(votingStart),
    votingEndsAt: toDateTimeLocal(votingEnd),
    votingStrategy: "fixed_per_wallet",
    votesPerWallet: 1,
    winnerCount: 1,
    maxSubmissionsPerWallet: 1,
    awards: [{ position: 1, title: "Winner", description: "", value: "" }],
  };
};

export function RequestRoundForm({ databaseConfigured }: { databaseConfigured: boolean }) {
  const { address, isConnected } = useUserAddress();
  const account = useActiveAccount();
  const [values, setValues] = useState<RequestFormValues>(initialValues);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const requestPayload = useMemo(
    () => ({
      ...values,
      walletAddress: address || "",
      submissionsOpenAt: toIsoOrValue(values.submissionsOpenAt),
      votingStartsAt: toIsoOrValue(values.votingStartsAt),
      votingEndsAt: toIsoOrValue(values.votingEndsAt),
    }),
    [address, values],
  );

  const canSubmit =
    databaseConfigured &&
    isConnected &&
    Boolean(
      address &&
        account &&
        values.requesterName &&
        values.requesterEmail &&
        values.title &&
        values.description &&
        values.content &&
        values.image &&
        values.awards.every((award) => award.title && award.value),
    );

  const updateValue = <Field extends keyof RequestFormValues>(
    field: Field,
    value: RequestFormValues[Field],
  ) => {
    setMessage("");
    setValues((current) => ({ ...current, [field]: value }));
  };

  const updateTitle = (title: string) => {
    setMessage("");
    setValues((current) => ({
      ...current,
      title,
      requestedSlug: normalizeRoundRequestSlug(title),
    }));
  };

  const updateWinnerCount = (winnerCount: number) => {
    const safeCount = Math.min(10, Math.max(1, winnerCount));
    setMessage("");
    setValues((current) => ({
      ...current,
      winnerCount: safeCount,
      awards: Array.from({ length: safeCount }, (_, index) => {
        const existing = current.awards[index];
        return (
          existing || {
            position: index + 1,
            title: `${index + 1} place`,
            description: "",
            value: "",
          }
        );
      }).map((award, index) => ({ ...award, position: index + 1 })),
    }));
  };

  const updateAward = (position: number, field: keyof RoundAwardInput, value: string) => {
    setMessage("");
    setValues((current) => ({
      ...current,
      awards: current.awards.map((award) =>
        award.position === position ? { ...award, [field]: value } : award,
      ),
    }));
  };

  const submit = async () => {
    if (!canSubmit || !address || !account) return;

    setIsSubmitting(true);
    setMessage("");

    try {
      const path = "/api/rounds/request";
      const payload = { walletAddress: address, request: requestPayload };
      const issuedAt = new Date().toISOString();
      const messageToSign = createRoundActionMessage({
        action: "request",
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
      if (!response.ok) throw new Error(result.error || "Round request failed.");

      setValues(initialValues());
      setMessage("Round request received. The Gnars team can review it in the admin dashboard.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Round request failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="container mx-auto max-w-4xl px-4 py-8">
      <div className="space-y-6">
        <Button asChild variant="ghost" className="px-0">
          <Link href="/rounds">
            <ArrowLeft className="size-4" />
            Back to rounds
          </Link>
        </Button>

        <section className="rounded-lg border border-border bg-muted/30 p-6 md:p-8">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Community funding
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">Request a round</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            Propose a time-boxed contest for projects, clips, spots, or community work.
          </p>
        </section>

        {!databaseConfigured && (
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-200">
            Demo mode is read-only. Configure the rounds database to enable round requests.
          </div>
        )}

        {!isConnected && (
          <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
            Connect the wallet that should be attached to this request.
          </div>
        )}

        <section className="space-y-6 rounded-lg border border-border bg-card p-6">
          <div className="grid gap-5 md:grid-cols-2">
            <FormField
              label="Your name"
              value={values.requesterName}
              onChange={(value) => updateValue("requesterName", value)}
              placeholder="Gnars builder"
            />
            <FormField
              label="Email"
              type="email"
              value={values.requesterEmail}
              onChange={(value) => updateValue("requesterEmail", value)}
              placeholder="you@example.com"
            />
          </div>

          <FormField
            label="Round title"
            value={values.title}
            onChange={updateTitle}
            placeholder="DIY spot check"
          />

          <RoundImageField
            label="Round image"
            value={values.image}
            onChange={(value) => updateValue("image", value)}
          />

          <FormField
            label="Reference URL"
            value={values.url || ""}
            onChange={(value) => updateValue("url", value)}
            placeholder="https://example.com"
          />

          <TextAreaField
            label="Summary"
            value={values.description}
            onChange={(value) => updateValue("description", value)}
            placeholder="Summarize the round in one or two paragraphs."
          />
          <TextAreaField
            label="Details"
            value={values.content}
            onChange={(value) => updateValue("content", value)}
            placeholder="Explain the prompt, eligibility, judging expectations, and what good submissions look like."
          />
          <TextAreaField
            label="Timeline notes"
            value={values.timeline || ""}
            onChange={(value) => updateValue("timeline", value)}
            placeholder="Optional notes about schedule, review cadence, or constraints."
            rows={4}
          />

          <div className="grid gap-5 md:grid-cols-3">
            <FormField
              label="Submissions open"
              type="datetime-local"
              value={values.submissionsOpenAt}
              onChange={(value) => updateValue("submissionsOpenAt", value)}
            />
            <FormField
              label="Voting starts"
              type="datetime-local"
              value={values.votingStartsAt}
              onChange={(value) => updateValue("votingStartsAt", value)}
            />
            <FormField
              label="Voting ends"
              type="datetime-local"
              value={values.votingEndsAt}
              onChange={(value) => updateValue("votingEndsAt", value)}
            />
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <div className="space-y-2">
              <label htmlFor="round-request-voting-strategy" className="text-sm font-medium">
                Voting
              </label>
              <select
                id="round-request-voting-strategy"
                value={values.votingStrategy}
                onChange={(event) =>
                  updateValue("votingStrategy", event.target.value as RoundVotingStrategy)
                }
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <option value="fixed_per_wallet">Fixed per wallet</option>
                <option value="one_per_wallet">One per wallet</option>
                <option value="one_per_nft">One per Gnars NFT</option>
              </select>
            </div>
            <NumberField
              label="Votes per wallet"
              value={values.votesPerWallet}
              onChange={(value) => updateValue("votesPerWallet", value)}
              min={1}
            />
            <NumberField
              label="Submissions per wallet"
              value={values.maxSubmissionsPerWallet}
              onChange={(value) => updateValue("maxSubmissionsPerWallet", value)}
              min={1}
              max={20}
            />
          </div>

          <div className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <h2 className="text-sm font-medium">Awards</h2>
              <div className="w-full sm:w-44">
                <NumberField
                  label="Winners"
                  value={values.winnerCount}
                  onChange={updateWinnerCount}
                  min={1}
                  max={10}
                />
              </div>
            </div>
            <div className="space-y-4">
              {values.awards.map((award) => (
                <div
                  key={award.position}
                  className="grid gap-3 rounded-md border border-border p-4 md:grid-cols-3"
                >
                  <FormField
                    label={`${award.position} place title`}
                    value={award.title}
                    onChange={(value) => updateAward(award.position, "title", value)}
                    placeholder="Winner"
                  />
                  <FormField
                    label="Value"
                    value={award.value}
                    onChange={(value) => updateAward(award.position, "value", value)}
                    placeholder="0.25 ETH"
                  />
                  <FormField
                    label="Description"
                    value={award.description || ""}
                    onChange={(value) => updateAward(award.position, "description", value)}
                    placeholder="Prize notes"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button onClick={submit} disabled={!canSubmit || isSubmitting}>
              {isSubmitting ? "Requesting..." : "Request round"}
            </Button>
            <Button variant="outline" onClick={() => setValues(initialValues())}>
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
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  const id = `round-request-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max?: number;
}) {
  const id = `round-request-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <Input
        id={id}
        type="number"
        value={String(value)}
        min={min}
        max={max}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  rows = 6,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  rows?: number;
}) {
  const id = `round-request-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <Textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={rows}
      />
    </div>
  );
}

function toDateTimeLocal(date: Date) {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

function toIsoOrValue(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : value;
}
