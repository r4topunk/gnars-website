// src/hooks/use-bid-comments.ts
"use client";

import { useEffect, useRef, useState } from "react";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";

const CALLDATA_PREFIX_LENGTH = 2 + 8 + 64; // "0x" + 4-byte selector + 32-byte arg

function decodeComment(input: string): string | null {
  if (!input || input.length <= CALLDATA_PREFIX_LENGTH) return null;

  const commentHex = input.slice(CALLDATA_PREFIX_LENGTH);
  if (commentHex.length === 0) return null;

  try {
    const bytes = new Uint8Array(
      commentHex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)),
    );
    const decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return decoded.trim() || null;
  } catch {
    return null; // Invalid UTF-8
  }
}

const CONCURRENCY = 5;

async function fetchCommentsForHashes(
  txHashes: string[],
  existing: Map<string, string | null>,
): Promise<Map<string, string | null>> {
  const client = createPublicClient({
    chain: base,
    transport: http(process.env.NEXT_PUBLIC_BASE_RPC_URL || "https://mainnet.base.org"),
  });

  const toFetch = txHashes.filter((h) => !existing.has(h));
  if (toFetch.length === 0) return existing;

  const result = new Map(existing);

  // Batch in chunks of CONCURRENCY
  for (let i = 0; i < toFetch.length; i += CONCURRENCY) {
    const chunk = toFetch.slice(i, i + CONCURRENCY);
    const settled = await Promise.allSettled(
      chunk.map(async (hash) => {
        const tx = await client.getTransaction({
          hash: hash as `0x${string}`,
        });
        return { hash, comment: decodeComment(tx.input) };
      }),
    );

    for (const res of settled) {
      if (res.status === "fulfilled") {
        result.set(res.value.hash, res.value.comment);
      } else {
        // RPC error — mark as null so we don't retry indefinitely
        const hash = chunk[settled.indexOf(res)];
        result.set(hash, null);
      }
    }
  }

  return result;
}

export function useBidComments(txHashes: string[]): {
  comments: Map<string, string | null>;
  isLoading: boolean;
} {
  const [comments, setComments] = useState<Map<string, string | null>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const commentsRef = useRef<Map<string, string | null>>(new Map());

  useEffect(() => {
    if (txHashes.length === 0) return;

    const newHashes = txHashes.filter((h) => !commentsRef.current.has(h));
    if (newHashes.length === 0) return;

    let cancelled = false;
    setIsLoading(true);

    fetchCommentsForHashes(txHashes, commentsRef.current).then((updated) => {
      if (cancelled) return;
      commentsRef.current = updated;
      setComments(new Map(updated));
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [txHashes.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  return { comments, isLoading };
}
