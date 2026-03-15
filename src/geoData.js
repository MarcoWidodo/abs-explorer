// Simplified GeoJSON data for Asian Barometer countries
// Contains approximate polygon bounds for visualization

export const ABS_COUNTRIES = {
  1: { name: "Japan", iso: "JPN", center: [138, 36], bounds: [[127, 26], [146, 45]] },
  2: { name: "Hong Kong", iso: "HKG", center: [114.2, 22.3], bounds: [[113.8, 22.1], [114.5, 22.6]] },
  3: { name: "South Korea", iso: "KOR", center: [127.8, 36], bounds: [[125, 33], [131, 39]] },
  4: { name: "China", iso: "CHN", center: [105, 35], bounds: [[73, 18], [135, 54]] },
  5: { name: "Mongolia", iso: "MNG", center: [103, 46], bounds: [[87, 41], [120, 52]] },
  6: { name: "Philippines", iso: "PHL", center: [122, 12], bounds: [[116, 5], [127, 20]] },
  7: { name: "Taiwan", iso: "TWN", center: [121, 24], bounds: [[119, 21], [123, 26]] },
  8: { name: "Thailand", iso: "THA", center: [101, 15], bounds: [[97, 6], [106, 21]] },
  9: { name: "Indonesia", iso: "IDN", center: [118, -2], bounds: [[95, -11], [141, 6]] },
  10: { name: "Singapore", iso: "SGP", center: [103.8, 1.35], bounds: [[103.6, 1.2], [104.1, 1.5]] },
  11: { name: "Vietnam", iso: "VNM", center: [108, 16], bounds: [[102, 8], [110, 24]] },
  12: { name: "Cambodia", iso: "KHM", center: [105, 13], bounds: [[102, 10], [108, 15]] },
  13: { name: "Malaysia", iso: "MYS", center: [110, 4], bounds: [[100, 1], [119, 8]] },
  14: { name: "Myanmar", iso: "MMR", center: [96, 21], bounds: [[92, 10], [101, 29]] },
  15: { name: "Australia", iso: "AUS", center: [134, -25], bounds: [[112, -44], [154, -10]] },
  18: { name: "India", iso: "IND", center: [79, 22], bounds: [[68, 6], [97, 36]] }
};

// Map ABS code to ISO
export const ABS_TO_ISO = Object.fromEntries(
  Object.entries(ABS_COUNTRIES).map(([code, data]) => [parseInt(code), data.iso])
);

export const ISO_TO_ABS = Object.fromEntries(
  Object.entries(ABS_COUNTRIES).map(([code, data]) => [data.iso, parseInt(code)])
);

// Get country by ABS code
export function getCountryByCode(code) {
  return ABS_COUNTRIES[code] || null;
}

// Get all country codes
export function getAllCountryCodes() {
  return Object.keys(ABS_COUNTRIES).map(Number);
}
