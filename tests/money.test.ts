import { describe, it, expect } from "vitest";
import { formatTSH, parseTSH } from "@/lib/money";

describe("formatTSH", () => {
  it("formats with thousands separators and a TSH prefix", () => {
    expect(formatTSH(8500)).toBe("TSH 8,500");
    expect(formatTSH(1000000)).toBe("TSH 1,000,000");
  });

  it("rounds fractional amounts", () => {
    expect(formatTSH(8500.6)).toBe("TSH 8,501");
  });
});

describe("parseTSH", () => {
  it("strips non-numeric characters", () => {
    expect(parseTSH("TSH 8,500")).toBe(8500);
  });

  it("falls back to 0 for unparsable input", () => {
    expect(parseTSH("abc")).toBe(0);
  });
});
