import { z } from "zod";

const configSchema = z.object({
  // Goldsky subgraph project ID
  goldskyProjectId: z.string().default("project_cm33ek8kjx6pz010i2c3w8z25"),

  // Database path (":memory:" for tests)
  databasePath: z.string().default("./data/gnars.db"),

  // Sync interval in minutes (0 = disabled)
  syncIntervalMinutes: z.number().min(0).default(5),

  // Gnars DAO Token address on Base (used to filter proposals in subgraph)
  daoAddress: z.string().default("0x880fb3cf5c6cc2d7dfc13a993e839a9411200c17"),
});

export type Config = z.infer<typeof configSchema>;

function loadConfig(): Config {
  return configSchema.parse({
    goldskyProjectId: process.env.GOLDSKY_PROJECT_ID,
    databasePath: process.env.DATABASE_PATH,
    syncIntervalMinutes: process.env.SYNC_INTERVAL_MINUTES
      ? parseInt(process.env.SYNC_INTERVAL_MINUTES, 10)
      : undefined,
    daoAddress: process.env.DAO_ADDRESS,
  });
}

export const config = loadConfig();

export function getSubgraphUrl(): string {
  return `https://api.goldsky.com/api/public/${config.goldskyProjectId}/subgraphs/nouns-builder-base-mainnet/latest/gn`;
}
