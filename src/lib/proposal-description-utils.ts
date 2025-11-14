/**
 * Utilities for parsing and formatting proposal descriptions
 */

export interface ParsedProposalDescription {
  title: string;
  description: string;
  ipfsHash?: string;
}

/**
 * Parse a combined proposal description into separate title and description
 * Supports Builder SDK format (Title && Description) and legacy formats
 */
export function parseProposalDescription(fullDescription: string): ParsedProposalDescription {
  if (!fullDescription?.trim()) {
    return { title: "", description: "" };
  }

  const trimmed = fullDescription.trim();
  
  // Handle Builder SDK format with && separator
  if (trimmed.includes(" && ")) {
    const parts = trimmed.split(" && ");
    const title = parts[0]?.trim() || "";
    const description = parts.slice(1).join(" && ").trim();
    
    // Extract IPFS hash from markdown image if present
    const ipfsMatch = description.match(/!\[.*?\]\(https:\/\/ipfs\.io\/ipfs\/([^)]+)\)/);
    const ipfsHash = ipfsMatch?.[1];
    
    return { title, description, ipfsHash };
  }
  
  // Handle legacy formats with newlines and **IPFS:** markers
  const sections = trimmed.split(/\n\n+/);
  let title = "";
  let description = "";
  let ipfsHash: string | undefined;
  
  for (const [i, section] of sections.entries()) {
    const cleanSection = section.trim();
    
    // Check for IPFS section
    const ipfsMatch = cleanSection.match(/^\*\*IPFS:\*\*\s*(.+)$/);
    if (ipfsMatch) {
      ipfsHash = ipfsMatch[1].trim();
      continue;
    }
    
    // First section is title (remove # if present)
    if (i === 0) {
      title = cleanSection.replace(/^#+\s*/, "");
    } else {
      // Remaining sections are description
      description = description ? `${description}\n\n${cleanSection}` : cleanSection;
    }
  }
  
  // Convert IPFS hash to markdown image in description
  if (ipfsHash) {
    const imageMarkdown = `![Proposal Image](https://ipfs.io/ipfs/${ipfsHash})`;
    description = description ? `${description}\n\n${imageMarkdown}` : imageMarkdown;
  }
  
  return { title: title || "", description: description || "", ipfsHash };
}

/**
 * Format title and description for Builder SDK proposal creation
 * Uses && separator with IPFS converted to markdown image
 */
export function formatProposalDescription(
  title: string,
  description: string,
  ipfsHash?: string
): string {
  const formatted = title.trim();
  
  let finalDescription = description.trim();
  
  // Add IPFS as markdown image to description
  if (ipfsHash) {
    const imageMarkdown = `![Proposal Image](https://ipfs.io/ipfs/${ipfsHash})`;
    finalDescription = finalDescription ? `${finalDescription} ${imageMarkdown}` : imageMarkdown;
  }
  
  // Use && separator for Builder SDK parsing
  return finalDescription ? `${formatted} && ${finalDescription}` : formatted;
}

/**
 * Check if a description needs parsing (contains combined title/description format)
 */
export function isLegacyCombinedFormat(description: string): boolean {
  if (!description?.trim()) return false;
  
  const trimmed = description.trim();
  return (
    trimmed.includes(" && ") ||
    (trimmed.includes("\n\n") && (trimmed.startsWith("#") || trimmed.includes("**IPFS:**")))
  );
}