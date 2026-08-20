import { describe, expect, it } from "vitest";
import {
  OPTIMIZED_DROPOSAL_VIDEO_CID_BY_ORIGINAL_CID,
  resolveDroposalPlaybackUrl,
} from "@/lib/droposal-media";

const ORIGINAL_CID = "QmbHbVzFTNSFpFUXHyKBrtGfJ3era6SpkQBjEEpzapeNex";
const OPTIMIZED_CID = OPTIMIZED_DROPOSAL_VIDEO_CID_BY_ORIGINAL_CID[ORIGINAL_CID];
const OPTIMIZED_URL = `https://ipfs.skatehive.app/ipfs/${OPTIMIZED_CID}`;

describe("resolveDroposalPlaybackUrl", () => {
  it.each([
    [
      "Qmak7m8x3ckbkM8YrghZRWm7zBqSUiYoCySdJ6bEwKuDRX",
      "bafybeid4f7v6yez2ibuay4kbmiuky44tph3gn32rnczkcmvno6nbjd7ykm",
    ],
    [
      "QmVF2BjJvA2MnjWuuNbUEAbMuzQD8JFks83TR6MdSgNY2e",
      "bafybeiazfjbov4ag7t6h7d77s2mokjsvz2dxyixogm7l5ptbrrg6qjxn7e",
    ],
  ])("uses the optimized Gnars Droposal video for %s", (originalCid, optimizedCid) => {
    expect(resolveDroposalPlaybackUrl(`ipfs://${originalCid}`)).toBe(
      `https://ipfs.skatehive.app/ipfs/${optimizedCid}`,
    );
  });

  it("replaces a mapped ipfs URI with its optimized CID", () => {
    expect(resolveDroposalPlaybackUrl(`ipfs://${ORIGINAL_CID}`)).toBe(OPTIMIZED_URL);
  });

  it("replaces a mapped gateway URL with its optimized CID", () => {
    expect(resolveDroposalPlaybackUrl(`https://example.com/ipfs/${ORIGINAL_CID}`)).toBe(
      OPTIMIZED_URL,
    );
  });

  it("keeps unmapped ipfs CIDs on the normal gateway path", () => {
    const cid = "QmUnmappedCidForDroposalPlayback";
    expect(resolveDroposalPlaybackUrl(`ipfs://${cid}`)).toBe(
      `https://magic.decentralized-content.com/ipfs/${cid}`,
    );
  });

  it("leaves non-IPFS HTTPS URLs unchanged", () => {
    const url = "https://example.com/video.mp4";
    expect(resolveDroposalPlaybackUrl(url)).toBe(url);
  });

  it("extracts an exact CID before a subpath, query, or fragment", () => {
    expect(
      resolveDroposalPlaybackUrl(
        `https://example.com/ipfs/${ORIGINAL_CID}/video.mp4?download=1#preview`,
      ),
    ).toBe(OPTIMIZED_URL);
  });

  it("does not mutate the original URI", () => {
    const originalUri = `ipfs://${ORIGINAL_CID}`;
    resolveDroposalPlaybackUrl(originalUri);
    expect(originalUri).toBe(`ipfs://${ORIGINAL_CID}`);
  });
});
