// Reverse geocoding (lat/long -> a human-readable address) via
// OpenStreetMap's free Nominatim API — no API key needed, which is why
// this project uses it instead of a paid provider (see CLAUDE.md: "No
// third-party APIs beyond the DB" — this is the one deliberate exception,
// chosen specifically because it needs no credentials to manage). Nominatim
// asks public API users to identify their application and keep request
// volume low; this app's usage (one lookup per manual location pick/capture
// by a small field team) comfortably fits that.
const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';

/**
 * Looks up a short, readable address for a coordinate. Returns null (never
 * throws) on any failure — reverse geocoding is a convenience that pre-fills
 * the Address field, not something that should block the surveyor from
 * continuing if the network/service is unavailable.
 */
export async function reverseGeocode(lat, lon) {
  try {
    const url = `${NOMINATIM_BASE}/reverse?format=jsonv2&lat=${lat}&lon=${lon}&addressdetails=1&accept-language=en`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.display_name || null;
  } catch {
    return null;
  }
}

/** Forward search (text -> matching places), used by the map picker's search box. */
export async function searchPlace(query) {
  try {
    const url = `${NOMINATIM_BASE}/search?format=jsonv2&q=${encodeURIComponent(query)}&addressdetails=1&limit=5&accept-language=en&countrycodes=in`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}
