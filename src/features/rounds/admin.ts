export const ROUND_ADMIN_WALLETS = [
  "0x39a7b6fa1597bb6657fe84e64e3b836c37d6f75d",
  "0xdcf37d8aa17142f053aaa7dc56025ab00d897a19",
  "0x8bf5941d27176242745b716251943ae4892a3c26",
] as const;

const ROUND_ADMIN_WALLET_SET = new Set(ROUND_ADMIN_WALLETS.map((address) => address.toLowerCase()));

export function isRoundAdminAddress(address?: string | null) {
  return Boolean(address && ROUND_ADMIN_WALLET_SET.has(address.toLowerCase()));
}
