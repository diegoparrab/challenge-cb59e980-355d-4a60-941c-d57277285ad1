export interface Challenge {
  readonly nonce: string;
  readonly issuedAt: number;
  readonly expiresAt: number;
  readonly consumed: boolean;
}
