import { Address, isAddress } from 'viem';

export interface ENSData {
  name: string | null;
  avatar: string | null;
  displayName: string;
  address: Address;
}

export interface ENSResolveResult {
  name: string | null;
  avatar: string | null;
}

// Rate limiting configuration
const RATE_LIMIT = {
  MAX_REQUESTS_PER_MINUTE: 30,
  MAX_REQUESTS_PER_SECOND: 5,
  CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
  BATCH_SIZE: 10,
  BATCH_DELAY: 100, // ms between batches
};

// In-memory cache for ENS data
const ensCache = new Map<string, { data: ENSResolveResult; timestamp: number }>();

// Rate limiting state
let requestCount = 0;
let lastResetTime = Date.now();
const batchQueue: Array<{ address: Address; resolve: (result: ENSResolveResult) => void }> = [];
let batchTimeout: NodeJS.Timeout | null = null;

/**
 * Check if we're within rate limits
 */
function checkRateLimit(): boolean {
  const now = Date.now();
  
  // Reset counter every minute
  if (now - lastResetTime > 60 * 1000) {
    requestCount = 0;
    lastResetTime = now;
  }
  
  // Check per-minute limit
  if (requestCount >= RATE_LIMIT.MAX_REQUESTS_PER_MINUTE) {
    return false;
  }
  
  return true;
}

/**
 * Process batch queue with rate limiting
 */
function processBatchQueue() {
  if (batchQueue.length === 0) return;
  
  const batch = batchQueue.splice(0, RATE_LIMIT.BATCH_SIZE);
  
  if (checkRateLimit()) {
    requestCount += batch.length;
    
    // Process batch in parallel
    Promise.allSettled(
      batch.map(({ address }) => resolveENSFromAPI(address))
    ).then((results) => {
      results.forEach((result, index) => {
        const { resolve } = batch[index];
        if (result.status === 'fulfilled') {
          resolve(result.value);
        } else {
          resolve({ name: null, avatar: null });
        }
      });
    });
  } else {
    // Rate limited, put back in queue
    batchQueue.unshift(...batch);
  }
  
  // Schedule next batch
  if (batchQueue.length > 0) {
    batchTimeout = setTimeout(processBatchQueue, RATE_LIMIT.BATCH_DELAY);
  }
}

/**
 * Add request to batch queue
 */
function queueENSRequest(address: Address): Promise<ENSResolveResult> {
  return new Promise((resolve) => {
    batchQueue.push({ address, resolve });
    
    if (!batchTimeout) {
      batchTimeout = setTimeout(processBatchQueue, RATE_LIMIT.BATCH_DELAY);
    }
  });
}

/**
 * Resolve ENS data from API with fallback strategies
 */
async function resolveENSFromAPI(address: Address): Promise<ENSResolveResult> {
  try {
    // Try primary ENS API
    const response = await fetch(`https://api.ensideas.com/ens/resolve/${address}`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Gnars-DAO/1.0',
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      return {
        name: data.displayName || data.name || null,
        avatar: data.avatar || null,
      };
    }
  } catch (error) {
    console.warn(`Failed to resolve ENS for ${address}:`, error);
  }
  
  // Fallback: Try alternative ENS resolver
  try {
    const response = await fetch(`https://ens.resolver.eth.link/resolve/${address}`, {
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      return {
        name: data.name || null,
        avatar: data.avatar || null,
      };
    }
  } catch (error) {
    console.warn(`Fallback ENS resolution failed for ${address}:`, error);
  }
  
  return { name: null, avatar: null };
}

// Removed unused generateFallbackAvatar helper

/**
 * Main ENS resolution function
 */
export async function resolveENS(address: string | Address): Promise<ENSData> {
  if (!address || !isAddress(address)) {
    throw new Error('Invalid Ethereum address');
  }
  
  const normalizedAddress = address.toLowerCase() as Address;
  
  // Check cache first
  const cached = ensCache.get(normalizedAddress);
  if (cached && Date.now() - cached.timestamp < RATE_LIMIT.CACHE_DURATION) {
    return {
      ...cached.data,
      displayName: cached.data.name || `${normalizedAddress.slice(0, 6)}...${normalizedAddress.slice(-4)}`,
      address: normalizedAddress,
    };
  }
  
  // Queue request for rate limiting
  const result = await queueENSRequest(normalizedAddress);
  
  // Cache the result
  ensCache.set(normalizedAddress, {
    data: result,
    timestamp: Date.now(),
  });
  
  return {
    ...result,
    displayName: result.name || `${normalizedAddress.slice(0, 6)}...${normalizedAddress.slice(-4)}`,
    address: normalizedAddress,
  };
}

/**
 * Batch resolve multiple ENS addresses
 */
export async function resolveENSBatch(addresses: (string | Address)[]): Promise<Map<Address, ENSData>> {
  const validAddresses = addresses
    .filter((addr): addr is Address => addr !== null && addr !== undefined && isAddress(addr))
    .map(addr => addr.toLowerCase() as Address);
  
  const results = new Map<Address, ENSData>();
  
  // Process in batches to respect rate limits
  for (let i = 0; i < validAddresses.length; i += RATE_LIMIT.BATCH_SIZE) {
    const batch = validAddresses.slice(i, i + RATE_LIMIT.BATCH_SIZE);
    
    const batchPromises = batch.map(async (address) => {
      try {
        const ensData = await resolveENS(address);
        return { address, ensData };
      } catch (error) {
        console.warn(`Failed to resolve ENS for ${address}:`, error);
        return {
          address,
          ensData: {
            name: null,
            avatar: null,
            displayName: `${address.slice(0, 6)}...${address.slice(-4)}`,
            address,
          },
        };
      }
    });
    
    const batchResults = await Promise.allSettled(batchPromises);
    
    batchResults.forEach((result) => {
      if (result.status === 'fulfilled') {
        const { address, ensData } = result.value;
        results.set(address, ensData);
      }
    });
    
    // Add delay between batches
    if (i + RATE_LIMIT.BATCH_SIZE < validAddresses.length) {
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT.BATCH_DELAY));
    }
  }
  
  return results;
}

/**
 * Clear cache (useful for testing or memory management)
 */
export function clearENSCache(): void {
  ensCache.clear();
}

/**
 * Get cache statistics
 */
export function getENSCacheStats(): { size: number; hitRate: number } {
  return {
    size: ensCache.size,
    hitRate: 0, // Could implement hit rate tracking if needed
  };
}
