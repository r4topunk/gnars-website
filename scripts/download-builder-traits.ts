#!/usr/bin/env tsx

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { GNARS_ADDRESSES } from "../src/lib/config";

type PropertyItem = {
  name: string;
  uri: string;
};

type Property = {
  name: string;
  items: PropertyItem[];
};

type PropertyItemsResponse = {
  propertiesCount: number;
  propertyItemsCount: number[];
  properties: Property[];
};

type UrlFormat =
  | "builder_renderer_stack_images"
  | "ipfs_uri"
  | "ipfs_gateway_http"
  | "http_url"
  | "unknown";

type UrlAnalysis = {
  input: string;
  format: UrlFormat;
  normalized?: string;
  details?: Record<string, unknown>;
};

type Options = {
  builderBaseUrl: string;
  chainId: number;
  metadataAddress: string;
  limit: number;
  outDir: string;
  imageUrl?: string;
  timeoutMs: number;
  gateways: string[];
};

type DownloadedItem = {
  traitName: string;
  itemName: string;
  sourceUri: string;
  savedPath?: string;
  fetchedFrom?: string;
  error?: string;
};

const DEFAULTS = {
  builderBaseUrl: "https://nouns.build",
  chainId: 8453,
  metadataAddress: GNARS_ADDRESSES.metadata,
  limit: 10,
  outDir: path.resolve(process.cwd(), "outputs", "builder-traits"),
  timeoutMs: 20000,
  gateways: [
    "https://ipfs.io",
    "https://dweb.link",
    "https://gateway.pinata.cloud",
    "https://w3s.link",
    "https://magic.decentralized-content.com",
    "https://ipfs.decentralized-content.com",
  ],
} as const;

const MIME_TO_EXT: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/svg+xml": ".svg",
};

function printHelp(): void {
  console.log(`
Uso:
  pnpm exec tsx scripts/download-builder-traits.ts [opcoes]

Opcoes:
  --builder-base-url <url>     Base da Builder API (default: ${DEFAULTS.builderBaseUrl})
  --chain-id <numero>          Chain id (default: ${DEFAULTS.chainId})
  --metadata-address <0x...>   Endereco do metadata contract (default: ${DEFAULTS.metadataAddress})
  --limit <numero>             Quantidade por tipo de trait (default: ${DEFAULTS.limit})
  --out-dir <pasta>            Pasta de saida (default: ${DEFAULTS.outDir})
  --image-url <url>            URL de imagem NFT para analise de formato
  --gateway <url1,url2,...>    Gateways IPFS em ordem de tentativa
  --timeout-ms <numero>        Timeout por request em ms (default: ${DEFAULTS.timeoutMs})
  --help                       Exibe ajuda
`);
}

function parseArgs(argv: string[]): Options {
  const options: Options = {
    builderBaseUrl: DEFAULTS.builderBaseUrl,
    chainId: DEFAULTS.chainId,
    metadataAddress: DEFAULTS.metadataAddress,
    limit: DEFAULTS.limit,
    outDir: DEFAULTS.outDir,
    timeoutMs: DEFAULTS.timeoutMs,
    gateways: [...DEFAULTS.gateways],
  };

  for (let i = 0; i < argv.length; i += 1) {
    const raw = argv[i];
    if (raw === "--help" || raw === "-h") {
      printHelp();
      process.exit(0);
    }

    if (!raw.startsWith("--")) {
      throw new Error(`Argumento invalido: ${raw}`);
    }

    const [flag, inlineValue] = raw.split("=", 2);
    const next = inlineValue ?? argv[i + 1];
    const hasInline = inlineValue !== undefined;

    const readValue = (): string => {
      if (!next || next.startsWith("--")) {
        throw new Error(`Faltando valor para ${flag}`);
      }
      if (!hasInline) {
        i += 1;
      }
      return next;
    };

    switch (flag) {
      case "--builder-base-url":
        options.builderBaseUrl = readValue();
        break;
      case "--chain-id":
        options.chainId = Number.parseInt(readValue(), 10);
        break;
      case "--metadata-address":
        options.metadataAddress = readValue();
        break;
      case "--limit":
        options.limit = Number.parseInt(readValue(), 10);
        break;
      case "--out-dir":
        options.outDir = path.resolve(readValue());
        break;
      case "--image-url":
        options.imageUrl = readValue();
        break;
      case "--gateway":
        options.gateways = readValue()
          .split(",")
          .map((part) => part.trim())
          .filter(Boolean);
        break;
      case "--timeout-ms":
        options.timeoutMs = Number.parseInt(readValue(), 10);
        break;
      default:
        throw new Error(`Flag desconhecida: ${flag}`);
    }
  }

  if (!Number.isFinite(options.chainId) || options.chainId <= 0) {
    throw new Error("--chain-id invalido");
  }
  if (!Number.isFinite(options.limit) || options.limit <= 0) {
    throw new Error("--limit invalido");
  }
  if (!Number.isFinite(options.timeoutMs) || options.timeoutMs <= 0) {
    throw new Error("--timeout-ms invalido");
  }
  if (options.gateways.length === 0) {
    throw new Error("Informe ao menos um gateway via --gateway");
  }

  return options;
}

function sanitizeSegment(value: string): string {
  const cleaned = value
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return cleaned || "item";
}

function normalizeIpfsUri(input: string): string | null {
  const value = input.trim().replace(/"/g, "");
  if (!value) return null;
  if (value.startsWith("ipfs://")) return value;

  const cidOnly = /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|ba[A-Za-z0-9]{50,})$/;
  if (cidOnly.test(value)) return `ipfs://${value}`;

  if (/^https?:\/\//.test(value) && value.includes("/ipfs/")) {
    try {
      const url = new URL(value);
      const normalizedPath = url.pathname.replace(/^\/ipfs\//, "");
      const extra = `${url.search}${url.hash}`;
      return `ipfs://${normalizedPath}${extra}`;
    } catch {
      return null;
    }
  }

  return null;
}

function decodeMaybe(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function analyzeUrlFormat(input: string): UrlAnalysis {
  const value = input.trim();
  if (!value) return { input, format: "unknown" };

  const normalizedIpfs = normalizeIpfsUri(value);
  if (normalizedIpfs) {
    const isGateway = /^https?:\/\//.test(value);
    return {
      input,
      format: isGateway ? "ipfs_gateway_http" : "ipfs_uri",
      normalized: normalizedIpfs,
    };
  }

  if (/^https?:\/\//.test(value)) {
    try {
      const url = new URL(value);
      const isStackImages =
        url.pathname.includes("/renderer/stack-images") &&
        url.searchParams.getAll("images").length > 0;

      if (isStackImages) {
        const images = url.searchParams
          .getAll("images")
          .map((item) => decodeMaybe(item))
          .map((item) => normalizeIpfsUri(item) ?? item);
        const traitHints = images
          .map((item) => {
            const clean = item.replace(/^ipfs:\/\//, "");
            const parts = clean.split("/").filter(Boolean);
            if (parts.length >= 2) return parts[1];
            return null;
          })
          .filter((part): part is string => Boolean(part));

        return {
          input,
          format: "builder_renderer_stack_images",
          normalized: url.toString(),
          details: {
            host: url.host,
            imageCount: images.length,
            images,
            traitHints,
          },
        };
      }

      return { input, format: "http_url", normalized: url.toString() };
    } catch {
      return { input, format: "unknown" };
    }
  }

  return { input, format: "unknown" };
}

function toGatewayCandidates(uri: string, gateways: string[]): string[] {
  const normalizedIpfs = normalizeIpfsUri(uri);
  if (normalizedIpfs) {
    const pathPart = normalizedIpfs.replace(/^ipfs:\/\//, "");
    return gateways.map((gateway) => `${gateway.replace(/\/$/, "")}/ipfs/${pathPart}`);
  }

  if (/^https?:\/\//.test(uri)) {
    return [uri];
  }

  return [];
}

function detectExtension(sourceUri: string, contentType: string | null): string {
  const stripQuery = (value: string) => value.split("?")[0]?.split("#")[0] ?? value;

  if (sourceUri.startsWith("ipfs://")) {
    const raw = stripQuery(sourceUri.replace(/^ipfs:\/\//, ""));
    const ext = path.extname(raw);
    if (ext) return ext.toLowerCase();
  } else if (/^https?:\/\//.test(sourceUri)) {
    try {
      const ext = path.extname(stripQuery(new URL(sourceUri).pathname));
      if (ext) return ext.toLowerCase();
    } catch {
      // fallback below
    }
  }

  if (contentType) {
    const key = contentType.split(";")[0]?.trim().toLowerCase();
    if (key && MIME_TO_EXT[key]) return MIME_TO_EXT[key];
  }

  return ".png";
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function ensurePropertyItemsResponse(data: unknown): PropertyItemsResponse {
  if (typeof data !== "object" || data === null) {
    throw new Error("Resposta invalida da property-items API");
  }

  const typed = data as Partial<PropertyItemsResponse>;
  if (!Array.isArray(typed.properties)) {
    throw new Error("Campo properties ausente/invalido");
  }

  for (const property of typed.properties) {
    if (!property || typeof property.name !== "string" || !Array.isArray(property.items)) {
      throw new Error("Formato de propriedade invalido");
    }
  }

  return typed as PropertyItemsResponse;
}

async function fetchPropertyItems(options: Options): Promise<PropertyItemsResponse> {
  const base = options.builderBaseUrl.replace(/\/$/, "");
  const endpoint = `${base}/api/property-items?chainId=${options.chainId}&metadataAddress=${options.metadataAddress}`;
  const res = await fetchWithTimeout(endpoint, options.timeoutMs);

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Falha em property-items (${res.status}): ${body}`);
  }

  const json = await res.json();
  return ensurePropertyItemsResponse(json);
}

async function downloadTraitItem(
  item: PropertyItem,
  traitDir: string,
  traitName: string,
  index: number,
  options: Options
): Promise<DownloadedItem> {
  const candidates = toGatewayCandidates(item.uri, options.gateways);
  if (candidates.length === 0) {
    return {
      traitName,
      itemName: item.name,
      sourceUri: item.uri,
      error: "URI nao suportada para download",
    };
  }

  let lastError = "Falha desconhecida";

  for (const candidate of candidates) {
    try {
      const res = await fetchWithTimeout(candidate, options.timeoutMs);
      if (!res.ok) {
        lastError = `HTTP ${res.status} em ${candidate}`;
        continue;
      }

      const contentType = res.headers.get("content-type");
      const ext = detectExtension(item.uri, contentType);
      const fileName = `${String(index + 1).padStart(2, "0")}-${sanitizeSegment(item.name)}${ext}`;
      const outputPath = path.join(traitDir, fileName);
      const buffer = Buffer.from(await res.arrayBuffer());
      await writeFile(outputPath, buffer);

      return {
        traitName,
        itemName: item.name,
        sourceUri: item.uri,
        fetchedFrom: candidate,
        savedPath: outputPath,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      lastError = `${message} em ${candidate}`;
    }
  }

  return {
    traitName,
    itemName: item.name,
    sourceUri: item.uri,
    error: lastError,
  };
}

function summarizeFormats(uris: string[]): Record<string, { count: number; examples: string[] }> {
  const summary = new Map<string, { count: number; examples: string[] }>();
  for (const uri of uris) {
    const analysis = analyzeUrlFormat(uri);
    const key = analysis.format;
    const current = summary.get(key) ?? { count: 0, examples: [] };
    current.count += 1;
    if (current.examples.length < 3) {
      current.examples.push(uri);
    }
    summary.set(key, current);
  }
  return Object.fromEntries(summary.entries());
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  await mkdir(options.outDir, { recursive: true });
  const traitsRoot = path.join(options.outDir, "traits");
  await mkdir(traitsRoot, { recursive: true });

  const imageUrlAnalysis = options.imageUrl ? analyzeUrlFormat(options.imageUrl) : undefined;
  if (imageUrlAnalysis) {
    console.log("Analise da image URL:");
    console.log(JSON.stringify(imageUrlAnalysis, null, 2));
  }

  console.log("Buscando traits via property-items...");
  const payload = await fetchPropertyItems(options);
  const allUris = payload.properties.flatMap((property) => property.items.map((item) => item.uri));
  const uriFormatSummary = summarizeFormats(allUris);

  const downloadResults: DownloadedItem[] = [];
  for (const property of payload.properties) {
    const traitName = property.name;
    const traitDir = path.join(traitsRoot, sanitizeSegment(traitName));
    await mkdir(traitDir, { recursive: true });

    const selected = property.items.slice(0, options.limit);
    console.log(`Trait ${traitName}: baixando ${selected.length} item(ns)...`);

    for (let i = 0; i < selected.length; i += 1) {
      const item = selected[i];
      const result = await downloadTraitItem(item, traitDir, traitName, i, options);
      downloadResults.push(result);

      if (result.error) {
        console.log(`  - erro: ${item.name} -> ${result.error}`);
      } else {
        console.log(`  - ok: ${item.name}`);
      }
    }
  }

  const reportPath = path.join(options.outDir, "report.json");
  const report = {
    generatedAt: new Date().toISOString(),
    options: {
      builderBaseUrl: options.builderBaseUrl,
      chainId: options.chainId,
      metadataAddress: options.metadataAddress,
      limit: options.limit,
      outDir: options.outDir,
      gateways: options.gateways,
      timeoutMs: options.timeoutMs,
      imageUrl: options.imageUrl ?? null,
    },
    imageUrlAnalysis: imageUrlAnalysis ?? null,
    propertySummary: {
      propertiesCount: payload.propertiesCount,
      propertyItemsCount: payload.propertyItemsCount,
      traitNames: payload.properties.map((p) => p.name),
    },
    uriFormatSummary,
    totals: {
      attempted: downloadResults.length,
      succeeded: downloadResults.filter((item) => !item.error).length,
      failed: downloadResults.filter((item) => Boolean(item.error)).length,
    },
    items: downloadResults,
  };

  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log("");
  console.log("Concluido.");
  console.log(`Traits salvos em: ${traitsRoot}`);
  console.log(`Relatorio salvo em: ${reportPath}`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Erro: ${message}`);
  process.exit(1);
});
