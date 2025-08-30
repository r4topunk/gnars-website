export const CHAIN = {
  id: 8453,
  name: 'base',
} as const

export const GNARS_ADDRESSES = {
  token: '0x880fb3cf5c6cc2d7dfc13a993e839a9411200c17',
  auction: '0x494eaa55ecf6310658b8fc004b0888dcb698097f',
  governor: '0x3dd4e53a232b7b715c9ae455f4e732465ed71b4c',
  treasury: '0x72ad986ebac0246d2b3c565ab2a1ce3a14ce6f88',
  metadata: '0xdc9799d424ebfdcf5310f3bad3ddcce3931d4b58',
} as const

export const ZORA_CREATOR = {
  base: '0x0cf0c3b75d522290d7d12c74d7f1f0cc47ccb23b',
} as const

export const SUBGRAPH = {
  // Placeholder; wire via Builder SDK client later
  goldskyProjectId: process.env.NEXT_PUBLIC_GOLDSKY_PROJECT_ID || 'project_cm33ek8kjx6pz010i2c3w8z25',
} as const

export const DAO_DESCRIPTION =
  'Action sports accelerator and community owned brand. Headless so you can shred more…'


