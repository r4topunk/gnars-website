/**
 * DroposalMetadata
 * Renders key-value sale/metadata rows derived from decoded droposal params.
 *
 * Props:
 * - rows: array of { parameter, value }
 */
import { getTranslations } from "next-intl/server";
import { SectionHeader } from "@/components/common/SectionHeader";
import { Card, CardContent } from "@/components/ui/card";
import { ipfsToHttp } from "@/lib/ipfs";

export interface MetadataRow {
  parameter: string;
  value: unknown;
}

export interface DroposalMetadataProps {
  rows: MetadataRow[] | null;
}

export async function DroposalMetadata({ rows }: DroposalMetadataProps) {
  const t = await getTranslations("droposals");
  return (
    <Card>
      <SectionHeader title={t("detail.metadataTitle")} />
      <CardContent>
        {rows && rows.length > 0 ? (
          <dl className="grid grid-cols-1 gap-2">
            {rows.map((row) => {
              const isUri =
                typeof row.value === "string" && row.parameter.toLowerCase().includes("uri");
              const text = String(row.value ?? "");
              const truncated =
                isUri && text.length > 28 ? `${text.slice(0, 18)}…${text.slice(-8)}` : text;
              return (
                <div
                  key={row.parameter}
                  className="flex items-start justify-between gap-3 rounded-md bg-muted/50 px-3 py-2"
                >
                  <dt className="text-xs text-muted-foreground">{row.parameter}</dt>
                  <dd className="text-sm text-right break-words">
                    {isUri ? (
                      <div className="inline-flex items-center gap-2">
                        <a
                          href={text.startsWith("ipfs://") ? ipfsToHttp(text) : text}
                          target="_blank"
                          rel="noreferrer"
                          className="underline decoration-dotted"
                        >
                          {truncated}
                        </a>
                      </div>
                    ) : (
                      <span>{String(row.value)}</span>
                    )}
                  </dd>
                </div>
              );
            })}
          </dl>
        ) : (
          <div className="text-muted-foreground">{t("detail.noSaleData")}</div>
        )}
      </CardContent>
    </Card>
  );
}
