/**
 * Calculate distance between two lat/lng points using the Haversine formula.
 * Returns distance in kilometers.
 */
export function getDistanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Format a timestamp to a human-readable relative time string.
 */
export function timeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/**
 * Format fuel price with Naira symbol.
 */
export function formatPrice(price) {
  return `₦${price.toLocaleString()}`;
}

/**
 * Get status label and color.
 */
export function getStatusInfo(status) {
  switch (status) {
    case "has_fuel":
      return { label: "Has Fuel", color: "#22c55e", bg: "#dcfce7" };
    case "out_of_stock":
      return { label: "Out of Stock", color: "#ef4444", bg: "#fee2e2" };
    case "long_queue":
      return { label: "Long Queue", color: "#eab308", bg: "#fef9c3" };
    default:
      return { label: "Unknown", color: "#6b7280", bg: "#f3f4f6" };
  }
}
