// The subject credential — what an issuer hands a subject after attesting, and
// what the subject pastes into /prove. Plain JSON, portable, holds no on-chain
// secret beyond the subject's own ZK material (which stays with the subject).

export type SubjectCredential = {
  v: 2;
  attestationId: string;
  contractAddress: string;
  chainId: number;
  issuer: string;
  subject: string;
  schemaId: string;
  schemaName: string;
  dataHash: string;
  hashAlgo: string;
  issuedAt: number; // unix seconds
  expiry: number; // unix seconds, 0 = none
  txHash?: string;
  /** Present only when the subject enabled a private proof at attest time. */
  zk?: {
    commitment: string;
    secret: string;
  };
};

export function parseCredential(text: string): SubjectCredential {
  const obj = JSON.parse(text);
  if (!obj || typeof obj !== "object") throw new Error("Not a credential object.");
  if (!obj.attestationId || !obj.issuer || !obj.schemaId) {
    throw new Error("Missing required credential fields.");
  }
  return obj as SubjectCredential;
}
