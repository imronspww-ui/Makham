const EARTH_RADIUS_KM = 6371

function toRadians(deg: number): number {
  return deg * (Math.PI / 180)
}

export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const dLat = toRadians(lat2 - lat1)
  const dLng = toRadians(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return EARTH_RADIUS_KM * c
}

export function calculateDeliveryFee(
  distanceKm: number,
  settings: { pricePerKm: number; minDistance: number; minFee: number; maxDistance: number },
): { fee: number; isOutOfRange: boolean } {
  if (distanceKm > settings.maxDistance) {
    return { fee: 0, isOutOfRange: true }
  }
  const calculated = distanceKm * settings.pricePerKm
  const fee = Math.ceil(Math.max(calculated, settings.minFee))
  return { fee, isOutOfRange: false }
}
