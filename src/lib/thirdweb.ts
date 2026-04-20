import { createThirdwebClient, type ThirdwebClient } from "thirdweb";
import { base as thirdwebBase } from "thirdweb/chains";

const CLIENT_ID = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;

let clientSingleton: ThirdwebClient | undefined;
let warned = false;

export function getThirdwebClient(): ThirdwebClient | undefined {
  if (!CLIENT_ID) {
    if (typeof window !== "undefined" && !warned) {
      warned = true;
      console.warn(
        "[thirdweb] NEXT_PUBLIC_THIRDWEB_CLIENT_ID is not set. Thirdweb transaction sending is disabled. Get a client ID at https://thirdweb.com/dashboard.",
      );
    }
    return undefined;
  }

  if (!clientSingleton) {
    clientSingleton = createThirdwebClient({ clientId: CLIENT_ID });
  }

  return clientSingleton;
}

export const THIRDWEB_CHAIN = thirdwebBase;
