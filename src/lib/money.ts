export function formatTSH(amount: number): string {
  return "TSH " + Math.round(amount).toLocaleString("en-US");
}

export function parseTSH(input: string): number {
  return parseInt(input.replace(/[^0-9]/g, ""), 10) || 0;
}
