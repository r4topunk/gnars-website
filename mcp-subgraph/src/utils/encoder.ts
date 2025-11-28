import { encode as toonEncode } from "@toon-format/toon";

export type OutputFormat = "json" | "toon";

/**
 * Encode data to the specified format (JSON or TOON)
 * TOON provides ~40% token savings for uniform array data
 */
export function encodeResponse(
  data: unknown,
  format: OutputFormat = "json"
): string {
  if (format === "toon") {
    try {
      return toonEncode(data);
    } catch {
      // Fallback to JSON if TOON encoding fails (e.g., unsupported data types)
      return JSON.stringify(data, null, 2);
    }
  }
  return JSON.stringify(data, null, 2);
}

/**
 * Create a standardized MCP response with the specified format
 */
export function createMcpResponse(
  data: unknown,
  format: OutputFormat = "json"
) {
  return {
    content: [{ type: "text" as const, text: encodeResponse(data, format) }],
  };
}
