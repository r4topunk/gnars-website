import { getPropDates, type PropDate, EasSDK, getDecodedValue } from "@buildeross/sdk/eas";
// Inline schema UID to avoid extra constants package dependency here
const PROPDATE_SCHEMA_UID =
  "0x8bd0d42901ce3cd9898dbea6ae2fbf1e796ef0923e7cbb0a1cecac2e42d47cb3" as const;
import { CHAIN, GNARS_ADDRESSES } from "@/lib/config";
import { isAddress, isHex, getAddress } from "viem";

export type Propdate = PropDate;

export async function listPropdates(proposalId: string): Promise<Propdate[]> {
  try {
    // Guard against bad inputs to avoid network calls that will fail
    if (!proposalId || !isHex(proposalId)) {
      return [];
    }
    if (!isAddress(GNARS_ADDRESSES.token)) {
      return [];
    }

    const propdates = await getPropDates(
      GNARS_ADDRESSES.token,
      CHAIN.id,
      proposalId
    );
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
  try {
    if (!isAddress(GNARS_ADDRESSES.token)) return [];

    const { attestations } = await EasSDK.connect(CHAIN.id).propdates({
      schemaId: PROPDATE_SCHEMA_UID,
      recipient: getAddress(GNARS_ADDRESSES.token),
    });

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

    const mapped: Propdate[] = await Promise.all(
      attestations.map(async (att: any) => {
        const decoded = JSON.parse(att.decodedDataJson) as Array<{ name: string; value: { value: unknown } }>;
        const messageTypeRaw = getDecodedValue(decoded as any, "messageType");
        const messageRaw = String(getDecodedValue(decoded as any, "message") ?? "");

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
            content = await res.text();
          } else if (messageType === 3) {
            // URL_JSON
            const res = await fetch(toHttp(messageRaw));
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

        const proposalId = String(getDecodedValue(decoded as any, "proposalId") ?? "0x");
        const originalMessageId = String(getDecodedValue(decoded as any, "originalMessageId") ?? "0x");
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
      })
    );

    // sort ascending to match noun-builder component expectations
    return mapped.sort((a, b) => a.timeCreated - b.timeCreated);
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

export async function createPropdate(
  proposalId: string,
  messageText: string
): Promise<void> {
  // TODO: Replace this with the actual SDK call
  console.log("Creating propdate:", { proposalId, messageText });
  await new Promise((resolve) => setTimeout(resolve, 1000));
}
