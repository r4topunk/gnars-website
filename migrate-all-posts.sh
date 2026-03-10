#!/bin/bash
set -e

SOURCE_DIR="$HOME/Code/gnarsdotcom/_posts"
POSTS_DIR="$HOME/Code/gnars-website/src/content/posts"
ARCHIVE_DIR="$HOME/Code/gnars-website/src/content/archive"

# Create posts directory if doesn't exist
mkdir -p "$POSTS_DIR"
mkdir -p "$ARCHIVE_DIR"

# Tier 1: Gnars-specific content (active posts)
TIER1=(
  "2022-01-09-controversy-copyright-nfts-cc0-solution.md"
  "2022-02-28-ecosystem-of-nounish-derivatives.md"
  "2022-03-26-best-cc0-nft-projects.md"
  "2022-04-08-sub-dao-culture.md"
  "2022-05-09-gnars-dao-x-mr-seaks.md"
  "2022-05-09-joe-atkinson-x-sydney.md"
  "2022-09-13-a-new-way-to-fund-extreme-athletes.md"
  "2023-11-20-gnars-ly.md"
  "2023-11-21-phillipine-cablewake.md"
  "2023-11-22-here-for-you.md"
  "2024-06-13-nogglerail-guide.md"
)

echo "Copying Tier 1 posts to /posts..."
for post in "${TIER1[@]}"; do
  if [ -f "$SOURCE_DIR/$post" ]; then
    cp "$SOURCE_DIR/$post" "$POSTS_DIR/"
    echo "✓ $post → posts/"
  else
    echo "✗ Missing: $post"
  fi
done

echo ""
echo "Copying remaining posts to /archive..."
for post in "$SOURCE_DIR"/*.md; do
  filename=$(basename "$post")
  
  # Skip if already in Tier 1
  if [[ " ${TIER1[@]} " =~ " ${filename} " ]]; then
    continue
  fi
  
  # Skip if already exists in archive
  if [ -f "$ARCHIVE_DIR/$filename" ]; then
    echo "↷ $filename (already in archive)"
    continue
  fi
  
  cp "$post" "$ARCHIVE_DIR/"
  echo "✓ $filename → archive/"
done

echo ""
echo "Migration complete!"
echo "Tier 1 (active): $(ls -1 "$POSTS_DIR" | wc -l) posts"
echo "Archive: $(ls -1 "$ARCHIVE_DIR" | wc -l) posts"
