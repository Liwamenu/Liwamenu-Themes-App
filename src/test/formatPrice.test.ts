import { describe, it, expect } from "vitest";

/**
 * Extracted formatPrice logic matching useRestaurant.ts implementation.
 */
function formatPrice(
  price: number,
  moneySign?: string | null,
  decimalPlaces?: number | null
): string {
  const decimals = decimalPlaces ?? 2;
  const formatted = price.toFixed(decimals);
  if (moneySign) {
    return `${moneySign}${formatted}`;
  }
  return formatted;
}

describe("formatPrice", () => {
  describe("decimalPlaces = null (default → 2)", () => {
    it("formats whole number with .00", () => {
      expect(formatPrice(10, "₺", null)).toBe("₺10.00");
    });
    it("formats fractional price with 2 decimals", () => {
      expect(formatPrice(12.5, "₺", null)).toBe("₺12.50");
    });
    it("rounds to 2 decimals", () => {
      expect(formatPrice(9.999, "₺", null)).toBe("₺10.00");
    });
    it("works without moneySign", () => {
      expect(formatPrice(5, null, null)).toBe("5.00");
    });
  });

  describe("decimalPlaces = undefined (default → 2)", () => {
    it("formats with .00 when decimalPlaces is undefined", () => {
      expect(formatPrice(10, "$", undefined)).toBe("$10.00");
    });
    it("works without moneySign", () => {
      expect(formatPrice(7.1, undefined, undefined)).toBe("7.10");
    });
  });

  describe("decimalPlaces = 0", () => {
    it("formats whole number without decimals", () => {
      expect(formatPrice(10, "₺", 0)).toBe("₺10");
    });
    it("rounds fractional price", () => {
      expect(formatPrice(12.7, "₺", 0)).toBe("₺13");
    });
    it("works without moneySign", () => {
      expect(formatPrice(99.4, null, 0)).toBe("99");
    });
  });

  describe("decimalPlaces = 1", () => {
    it("formats with one decimal place", () => {
      expect(formatPrice(10, "€", 1)).toBe("€10.0");
    });
    it("rounds to one decimal", () => {
      expect(formatPrice(12.56, "€", 1)).toBe("€12.6");
    });
    it("works without moneySign", () => {
      expect(formatPrice(3.14, null, 1)).toBe("3.1");
    });
  });

  describe("decimalPlaces = 2", () => {
    it("formats explicitly with two decimal places", () => {
      expect(formatPrice(10, "$", 2)).toBe("$10.00");
    });
    it("preserves two decimals on fractional price", () => {
      expect(formatPrice(19.9, "$", 2)).toBe("$19.90");
    });
  });

  describe("edge cases", () => {
    it("formats zero correctly", () => {
      expect(formatPrice(0, "₺", null)).toBe("₺0.00");
      expect(formatPrice(0, "₺", 0)).toBe("₺0");
    });
    it("handles large numbers", () => {
      expect(formatPrice(123456.789, "$", 2)).toBe("$123456.79");
    });
    it("handles very small prices", () => {
      expect(formatPrice(0.001, "€", 2)).toBe("€0.00");
      expect(formatPrice(0.001, "€", 3)).toBe("€0.001");
    });
  });
});