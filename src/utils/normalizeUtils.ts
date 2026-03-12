export function normalizePalletType(value: string | null | undefined): string {
  return (value ?? '').toLowerCase().trim();
}

export function normalizeSize(value: string | null | undefined): string {
  return (value ?? '').toLowerCase().trim();
}
