import { describe, expect, it } from "vitest";
import { calculateReservedCredits, getAvailableCredits } from "@/lib/domain/credits";

describe("credit calculations", () => {
  it("uses one internal credit per pledged hour", () => {
    expect(calculateReservedCredits(12)).toBe(12);
  });

  it("rounds pledge hours to two decimals before reservation", () => {
    expect(calculateReservedCredits(1.239)).toBe(1.24);
  });

  it("rejects zero or negative hours", () => {
    expect(() => calculateReservedCredits(0)).toThrow("Pledge hours must be greater than zero.");
    expect(() => calculateReservedCredits(-1)).toThrow("Pledge hours must be greater than zero.");
  });

  it("rejects positive hours below the minimum credit granularity", () => {
    expect(() => calculateReservedCredits(0.001)).toThrow("Pledge hours must be at least 0.01.");
    expect(() => calculateReservedCredits(0.004)).toThrow("Pledge hours must be at least 0.01.");
    expect(() => calculateReservedCredits(0.005)).toThrow("Pledge hours must be at least 0.01.");
  });

  it("accepts the minimum credit granularity", () => {
    expect(calculateReservedCredits(0.01)).toBe(0.01);
  });

  it("computes available credits from balance and reservations", () => {
    expect(getAvailableCredits({ balance: 250, reserved: 40.5 })).toBe(209.5);
  });
});
