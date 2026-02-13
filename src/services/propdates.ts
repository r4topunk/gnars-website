import {
  EasSDK,
  getDecodedValue,
  getPropDates,
  type DecodedData,
  type PropDate,
} from "@buildeross/sdk/eas";
import { encodeAbiParameters, getAddress, isAddress, isHex, parseAbiParameters, zeroHash } from "viem";
import { CHAIN, GNARS_ADDRESSES } from "@/lib/config";
import { AttestationRequest, PropdateMessageType, PROPDATE_SCHEMA, PROPDATE_SCHEMA_UID } from "@/lib/eas";

export type Propdate = PropDate;

const DAO_PROPDATES_CACHE_TTL_MS = 30_000;

let daoPropdatesCache: { data: Propdate[]; expiresAt: number } | null = null;
let daoPropdatesPromise: Promise<Propdate[]> | null = null;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === attempts) {
        break;
      }
      const delay = attempt * 500;
      console.warn("[propdates:retry] request failed, retrying", {
        attempt,
        delay,
        error: error instanceof Error ? error.message : String(error),
      });
      await sleep(delay);
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError ?? "Unknown error"));
}

async function fetchDaoPropdatesFromEas(): Promise<Propdate[]> {
  if (!isAddress(GNARS_ADDRESSES.token)) return [];

  const { attestations } = await withRetry(() =>
    EasSDK.connect(CHAIN.id).propdates({
      schemaId: PROPDATE_SCHEMA_UID,
      recipient: getAddress(GNARS_ADDRESSES.token),
    }),
  );

  if (!attestations?.length) return [];

  const toHttp = (uri: string) => {
    if (uri.startsWith("ipfs://")) {
      const path = uri.replace("ipfs://", "");
      return `https://ipfs.io/ipfs/${path}`;
    }
    if (uri.startsWith("ar://")) {
      return `https://arweave.net/${uri.replace("ar://", "")}`;
    }
    if (uri.startsWith("arweave://")) {
      return `https://arweave.net/${uri.replace("arweave://", "")}`;
    }
    return uri;
  };

  const mapped = await Promise.all(
    attestations.map(async (att) => {
      try {
        if (!att?.decodedDataJson) {
          throw new Error("Missing decodedDataJson");
        }

        const decoded = JSON.parse(att.decodedDataJson) as DecodedData[];
        const messageTypeRaw = getDecodedValue(decoded, "messageType");
        const messageRaw = String(getDecodedValue(decoded, "message") ?? "");

        let content = messageRaw;
        let milestoneId: number | null = null;

        try {
          const messageType = Number(messageTypeRaw ?? 0);
          if (messageType === 1) {
            // INLINE_JSON
            const parsed = JSON.parse(messageRaw) as { content?: string; milestoneId?: number };
            content = String(parsed?.content ?? "");
            milestoneId = typeof parsed?.milestoneId === "number" ? parsed.milestoneId : null;
          } else if (messageType === 2) {
            // URL_TEXT
            const res = await fetch(toHttp(messageRaw));
            if (!res.ok) {
              throw new Error(`Failed to fetch text content (status ${res.status})`);
            }
            content = await res.text();
          } else if (messageType === 3) {
            // URL_JSON
            const res = await fetch(toHttp(messageRaw));
            if (!res.ok) {
              throw new Error(`Failed to fetch json content (status ${res.status})`);
            }
            const parsed = (await res.json()) as { content?: string; milestoneId?: number };
            content = String(parsed?.content ?? "");
            milestoneId = typeof parsed?.milestoneId === "number" ? parsed.milestoneId : null;
          }
        } catch {
          // fallthrough with raw content
        }

        if (!content || content.trim().length === 0) {
          // As a last resort, show the original message value (often an ipfs uri)
          content = messageRaw;
        }

        const proposalId = String(getDecodedValue(decoded, "proposalId") ?? "0x");
        const originalMessageId = String(getDecodedValue(decoded, "originalMessageId") ?? "0x");

        return {
          id: att.id,
          attester: att.attester,
          proposalId: proposalId as `0x${string}`,
          originalMessageId: originalMessageId as `0x${string}`,
          milestoneId,
          message: content,
          txid: att.txid,
          timeCreated: Number(att.timeCreated ?? 0),
        } as Propdate;
      } catch (error) {
        console.error("[propdates:listDaoPropdates] attestation skipped", {
          attestationId: att?.id,
          txid: att?.txid,
          error: error instanceof Error ? error.message : String(error),
        });
        return null;
      }
    }),
  );

  const sanitized = mapped.filter((item): item is Propdate => Boolean(item));

  if (!sanitized.length) {
    return [];
  }

  // sort ascending to match noun-builder component expectations
  return sanitized.sort((a, b) => a.timeCreated - b.timeCreated);
}

export async function listPropdates(proposalId: string): Promise<Propdate[]> {
  try {
    // Guard against bad inputs to avoid network calls that will fail
    if (!proposalId || !isHex(proposalId)) {
      return [];
    }
    if (!isAddress(GNARS_ADDRESSES.token)) {
      return [];
    }

    const propdates = await getPropDates(GNARS_ADDRESSES.token, CHAIN.id, proposalId);
    return propdates;
  } catch (err) {
    console.error("[propdates:listPropdates] fetch failed", {
      proposalId,
      chainId: CHAIN.id,
      error: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}

// Fetch all DAO propdates in a single request (avoids N calls for N proposals)
export async function listDaoPropdates(): Promise<Propdate[]> {
  const now = Date.now();

  if (daoPropdatesCache && now < daoPropdatesCache.expiresAt) {
    return daoPropdatesCache.data;
  }

  if (daoPropdatesPromise) {
    return daoPropdatesPromise;
  }

  daoPropdatesPromise = fetchDaoPropdatesFromEas()
    .then((data) => {
      daoPropdatesCache = {
        data,
        expiresAt: Date.now() + DAO_PROPDATES_CACHE_TTL_MS,
      };
      return data;
    })
    .catch((error) => {
      if (daoPropdatesCache) {
        console.warn("[propdates:listDaoPropdates] serving stale cache after fetch failure", {
          error: error instanceof Error ? error.message : String(error),
        });
        return daoPropdatesCache.data;
      }
      throw error;
    })
    .finally(() => {
      daoPropdatesPromise = null;
    });

  try {
    return await daoPropdatesPromise;
  } catch (err) {
    console.error("[propdates:listDaoPropdates] fetch failed", {
      chainId: CHAIN.id,
      error: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}

export async function getPropdateByTxid(txid: string): Promise<Propdate | null> {
  try {
    const all = await listDaoPropdates();
    const found = all.find((p) => p.txid.toLowerCase() === txid.toLowerCase());
    return found ?? null;
  } catch (err) {
    console.error("[propdates:getPropdateByTxid] failed", {
      txid,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

const propdateSchemaParams = parseAbiParameters(PROPDATE_SCHEMA);

function encodePropdateMessage(proposalId: string, messageText: string): `0x${string}` {
  const trimmedProposalId = proposalId.trim();
  if (!trimmedProposalId || !isHex(trimmedProposalId)) {
    throw new Error("Invalid proposal ID for propdate");
  }

  const trimmedMessage = messageText.trim();
  if (!trimmedMessage) {
    throw new Error("Propdate message must not be empty");
  }

  return encodeAbiParameters(propdateSchemaParams, [
    trimmedProposalId as `0x${string}`,
    zeroHash,
    PropdateMessageType.INLINE_TEXT,
    trimmedMessage,
  ]);
}

export async function createPropdate(
  proposalId: string,
  messageText: string,
): Promise<AttestationRequest> {
  const encoded = encodePropdateMessage(proposalId, messageText);

  return {
    schema: PROPDATE_SCHEMA_UID,
    data: {
      recipient: getAddress(GNARS_ADDRESSES.token),
      expirationTime: 0n,
      revocable: true,
      refUID: zeroHash,
      data: encoded,
      value: 0n,
    },
  };
}
