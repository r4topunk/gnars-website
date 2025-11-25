// Text chunking for embedding generation

export interface TextChunk {
  text: string;
  index: number;
}

export interface ChunkOptions {
  maxChunkSize?: number; // Max characters per chunk (default: 500)
  overlap?: number; // Character overlap between chunks (default: 50)
}

/**
 * Split text into overlapping chunks for embedding.
 * Tries to break at sentence boundaries when possible.
 */
export function chunkText(text: string, options: ChunkOptions = {}): TextChunk[] {
  const { maxChunkSize = 500, overlap = 50 } = options;

  // Clean and normalize text
  const cleanedText = text
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (cleanedText.length <= maxChunkSize) {
    return [{ text: cleanedText, index: 0 }];
  }

  const chunks: TextChunk[] = [];
  let currentPos = 0;
  let chunkIndex = 0;

  while (currentPos < cleanedText.length) {
    let endPos = Math.min(currentPos + maxChunkSize, cleanedText.length);

    // If not at the end, try to find a good break point
    if (endPos < cleanedText.length) {
      const searchStart = Math.max(currentPos + maxChunkSize - 100, currentPos);
      const searchText = cleanedText.slice(searchStart, endPos);

      // Look for sentence boundaries (. ! ?)
      const sentenceMatch = searchText.match(/[.!?]\s+(?=[A-Z])/g);
      if (sentenceMatch) {
        const lastSentenceEnd = searchText.lastIndexOf(sentenceMatch[sentenceMatch.length - 1]);
        if (lastSentenceEnd > 0) {
          endPos = searchStart + lastSentenceEnd + sentenceMatch[sentenceMatch.length - 1].length;
        }
      } else {
        // Fall back to paragraph or line breaks
        const lineBreak = searchText.lastIndexOf("\n\n");
        if (lineBreak > 0) {
          endPos = searchStart + lineBreak + 2;
        } else {
          const singleBreak = searchText.lastIndexOf("\n");
          if (singleBreak > 0) {
            endPos = searchStart + singleBreak + 1;
          }
        }
      }
    }

    const chunkText = cleanedText.slice(currentPos, endPos).trim();
    if (chunkText.length > 0) {
      chunks.push({ text: chunkText, index: chunkIndex++ });
    }

    // Move position with overlap
    currentPos = endPos - overlap;
    if (currentPos >= cleanedText.length - overlap) {
      break;
    }
  }

  return chunks;
}

/**
 * Create a searchable text from proposal title and description.
 */
export function prepareProposalText(title: string, description: string): string {
  // Clean markdown formatting for better embedding
  const cleanDescription = description
    .replace(/#{1,6}\s+/g, "") // Remove headers
    .replace(/\*{1,2}([^*]+)\*{1,2}/g, "$1") // Remove bold/italic
    .replace(/`{1,3}[^`]+`{1,3}/g, "") // Remove code blocks
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // Convert links to text
    .replace(/^\s*[-*+]\s+/gm, "") // Remove list markers
    .replace(/^\s*\d+\.\s+/gm, ""); // Remove numbered list markers

  return `${title}\n\n${cleanDescription}`.trim();
}
