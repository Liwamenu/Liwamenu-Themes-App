import type { DeliveryZone } from "@/types/restaurant";

/**
 * Resolve which delivery zone a customer falls into, given their distance
 * from the restaurant in kilometres.
 *
 * UPPER-BOUND model: zones are sorted ascending by `maxDistanceKm` and the
 * customer falls into the FIRST zone whose `maxDistanceKm >= distanceKm`.
 * That zone's `minOrderAmount` / `deliveryFee` then apply. The largest
 * `maxDistanceKm` across all zones is the effective delivery radius — a
 * customer beyond it matches no zone and the function returns `null`
 * (= out of coverage, cannot place a paket order).
 *
 * Defensive about input shape: a null/empty `zones` array, or zones with a
 * non-finite `maxDistanceKm`, are ignored. The input array is never mutated
 * (we sort a shallow copy).
 *
 * @param distanceKm Customer↔restaurant distance in km (e.g. from Haversine).
 * @param zones      The restaurant's configured delivery zones.
 * @returns The matching zone, or `null` when out of coverage / no valid zones.
 */
export function findTierByDistance(
  distanceKm: number,
  zones: DeliveryZone[] | null | undefined,
): DeliveryZone | null {
  if (!Array.isArray(zones) || zones.length === 0) return null;
  if (!Number.isFinite(distanceKm)) return null;

  const sorted = zones
    .filter((z) => z && Number.isFinite(z.maxDistanceKm))
    .sort((a, b) => a.maxDistanceKm - b.maxDistanceKm);

  for (const zone of sorted) {
    if (distanceKm <= zone.maxDistanceKm) return zone;
  }
  return null;
}

/**
 * The effective paket delivery radius = the largest `maxDistanceKm` across
 * all zones. Returns `null` when there are no valid zones (caller should then
 * fall back to the flat `restaurant.maxDistance`).
 */
export function getMaxZoneDistance(
  zones: DeliveryZone[] | null | undefined,
): number | null {
  if (!Array.isArray(zones) || zones.length === 0) return null;
  const valid = zones
    .map((z) => z?.maxDistanceKm)
    .filter((d): d is number => Number.isFinite(d));
  if (valid.length === 0) return null;
  return Math.max(...valid);
}
