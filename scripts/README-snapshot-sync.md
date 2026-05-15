# Snapshot Proposals Sync

## Overview

Fetches ALL proposals from Snapshot.org GraphQL API for `gnars.eth` space and saves to `public/data/snapshot-proposals.json`.

## Why sync?

- **Completeness**: Ensures we have all historical Snapshot proposals
- **Freshness**: Updates when new Snapshot proposals are created
- **Backup**: Creates backup before writing (`snapshot-proposals.backup.json`)

## Usage

### Dry-run (test without writing)

```bash
node scripts/sync-snapshot-proposals.mjs --dry-run
```

### Execute sync

```bash
node scripts/sync-snapshot-proposals.mjs
```

## What it does

1. **Fetch from Snapshot API** - Paginated GraphQL queries (100 per page)
2. **Compare with existing** - Shows added/removed/unchanged proposals
3. **Backup original** - Creates `.backup.json` before writing
4. **Save to JSON** - Updates `public/data/snapshot-proposals.json`
5. **Summary report** - Shows changes and stats

## Output Example

```
🚀 Snapshot Proposals Sync

📂 Loaded 101 existing proposals

📡 Fetching proposals from Snapshot.org (space: gnars.eth)...

  ✅ Fetched 100 proposals (skip: 0, total: 100)
  ✅ Fetched 1 proposals (skip: 100, total: 101)

📝 Saving proposals...
  💾 Backup saved: snapshot-proposals.backup.json
  ✅ Saved 101 proposals to snapshot-proposals.json

============================================================
📊 Sync Summary
============================================================
Old proposals:     101
New proposals:     101
Added:             0 ✨
Removed:           0
Unchanged:         101
============================================================

✅ Sync completed successfully!
```

## When to run

- **After new Snapshot proposal** - Manual sync after community creates proposal
- **Monthly maintenance** - Ensure no proposals were missed
- **Before major updates** - Verify data integrity before deploys

## API Details

- **Endpoint**: `https://hub.snapshot.org/graphql`
- **Query**: See script for full GraphQL query
- **Rate limiting**: 500ms delay between paginated requests
- **Max per page**: 100 proposals

## Data Structure

Each proposal includes:

- `id` - Unique hash
- `title` - Proposal title
- `body` - Markdown description
- `choices` - Vote options
- `start` - Voting start timestamp
- `end` - Voting end timestamp
- `snapshot` - Block number
- `state` - active/closed/pending
- `author` - Proposer address
- `created` - Creation timestamp
- `scores` - Vote counts [FOR, AGAINST, ABSTAIN]
- `scores_total` - Total votes
- `votes` - Number of voters
- `space` - gnars.eth

## Troubleshooting

**Error: GraphQL errors**

- Check Snapshot API status: https://status.snapshot.org
- Verify query syntax in script

**Error: Failed to fetch**

- Network issue, retry
- Check if Snapshot.org is accessible

**Warning: Removed proposals**

- Review changes before committing
- Snapshot proposals should never be removed
- Likely API issue or data corruption

## Related

- Snapshot.org: https://snapshot.org/#/gnars.eth
- Snapshot API Docs: https://docs.snapshot.box/tools/api
- GraphQL Explorer: https://hub.snapshot.org/graphql

## Next Steps After Sync

1. **Review changes**

   ```bash
   git diff public/data/snapshot-proposals.json
   ```

2. **Commit if valid**

   ```bash
   git add public/data/snapshot-proposals.json
   git commit -m "chore: sync Snapshot proposals"
   ```

3. **Deploy**
   - Push to trigger Vercel build
   - New proposals will appear on gnars.com/proposals
