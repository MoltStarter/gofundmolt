type WalletLike = {
  balance: number;
  reserved: number;
};

export function calculateReservedCredits(hours: number): number {
  if (!Number.isFinite(hours) || hours <= 0) {
    throw new Error("Pledge hours must be greater than zero.");
  }

  if (hours < 0.01) {
    throw new Error("Pledge hours must be at least 0.01.");
  }

  return Math.round(hours * 100) / 100;
}

export function getAvailableCredits(wallet: WalletLike): number {
  return Math.round((wallet.balance - wallet.reserved) * 100) / 100;
}
