import { describe, expect, it } from "vitest";
import { csvEscape, orderNumber, parseCsv, slugify, toCsv } from "@/lib/utils";
import { discountPercent, effectivePrice, formatMoney, toCents } from "@/lib/money";
import { sniffImageType } from "@/lib/cloudinary";

describe("money", () => {
  it("formats and converts without float drift", () => {
    expect(toCents("19.99")).toBe(1999);
    expect(toCents(0.1 + 0.2)).toBe(30);
    expect(formatMoney(12345)).toBe("$123.45");
  });
  it("picks the sale price only when lower", () => {
    expect(effectivePrice({ priceCents: 1000, salePriceCents: 800 })).toBe(800);
    expect(effectivePrice({ priceCents: 1000, salePriceCents: 1200 })).toBe(1000);
    expect(discountPercent({ priceCents: 1000, salePriceCents: 750 })).toBe(25);
  });
});

describe("csv", () => {
  it("neutralises spreadsheet formula injection", () => {
    expect(csvEscape("=HYPERLINK(\"http://evil\")")).toBe('"\'=HYPERLINK(""http://evil"")"');
    expect(csvEscape("+1")).toBe("'+1");
  });
  it("round-trips quoted fields and newlines", () => {
    const rows = parseCsv('name,desc\n"Tee, Blue","line1\nline2"\nHat,"say ""hi"""\n');
    expect(rows).toEqual([["name", "desc"], ["Tee, Blue", "line1\nline2"], ["Hat", 'say "hi"']]);
    expect(toCsv([{ a: 1, b: "x,y" }])).toBe('a,b\n1,"x,y"');
  });
});

describe("misc", () => {
  it("slugifies", () => expect(slugify("Café Au Lait & Co.")).toBe("cafe-au-lait-co"));
  it("generates readable unique order numbers", () => {
    const a = orderNumber(new Date("2026-11-19T10:00:00Z"));
    expect(a).toMatch(/^SS-20261119-[0-9A-F]{6}$/);
    expect(orderNumber()).not.toBe(orderNumber());
  });
  it("sniffs real image types and rejects disguised files", () => {
    expect(sniffImageType(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0, 0]))).toBe("jpeg");
    expect(sniffImageType(Buffer.from("<svg onload=alert(1)></svg>   "))).toBeNull();
    expect(sniffImageType(Buffer.from("MZ executable header bytes here"))).toBeNull();
  });
});
