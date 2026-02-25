import type { Address, Hex } from "viem";

export const EAS_CONTRACT_ADDRESS = "0x4200000000000000000000000000000000000021" as const;

export const PROPDATE_SCHEMA_UID =
  "0x8bd0d42901ce3cd9898dbea6ae2fbf1e796ef0923e7cbb0a1cecac2e42d47cb3" as const;

export const PROPDATE_SCHEMA =
  "bytes32 proposalId, bytes32 originalMessageId, uint8 messageType, string message" as const;

export const easAbi = [
  {
    inputs: [
      {
        components: [
          { internalType: "bytes32", name: "schema", type: "bytes32" },
          {
            components: [
              { internalType: "address", name: "recipient", type: "address" },
              { internalType: "uint64", name: "expirationTime", type: "uint64" },
              { internalType: "bool", name: "revocable", type: "bool" },
              { internalType: "bytes32", name: "refUID", type: "bytes32" },
              { internalType: "bytes", name: "data", type: "bytes" },
              { internalType: "uint256", name: "value", type: "uint256" },
            ],
            internalType: "struct AttestationRequestData",
            name: "data",
            type: "tuple",
          },
        ],
        internalType: "struct AttestationRequest",
        name: "request",
        type: "tuple",
      },
    ],
    name: "attest",
    outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
    stateMutability: "payable",
    type: "function",
  },
] as const;

export enum PropdateMessageType {
  INLINE_TEXT = 0,
  INLINE_JSON = 1,
  URL_TEXT = 2,
  URL_JSON = 3,
}

export interface AttestationRequestData {
  recipient: Address;
  expirationTime: bigint;
  revocable: boolean;
  refUID: Hex;
  data: Hex;
  value: bigint;
}

export interface AttestationRequest {
  schema: Hex;
  data: AttestationRequestData;
}
