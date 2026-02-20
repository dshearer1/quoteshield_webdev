/**
 * Extract location components from address string for region_key.
 */

const US_STATE_CODES = new Set([
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS",
  "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY",
  "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV",
  "WI", "WY", "DC",
]);

export interface ParsedAddress {
  state: string | null;
  zip: string | null;
  zip5: string | null;
  zip3: string | null;
}

/**
 * Parse address string to extract state and zip.
 * Returns: { state: "AL", zip: "36526", zip5: "36526", zip3: "365" }
 */
export function parseAddressForRegion(addr: string | null | undefined): ParsedAddress {
  if (!addr || typeof addr !== "string") {
    return { state: null, zip: null, zip5: null, zip3: null };
  }

  const trimmed = addr.trim();
  if (!trimmed) return { state: null, zip: null, zip5: null, zip3: null };

  let state: string | null = null;
  let zip: string | null = null;
  let zip5: string | null = null;
  let zip3: string | null = null;

  // Try "state zip" pattern
  const stateZipMatch = trimmed.match(/\b([A-Z]{2})\s+(\d{5}(?:-\d{4})?)\b/i);
  if (stateZipMatch) {
    state = stateZipMatch[1].toUpperCase();
    zip = stateZipMatch[2];
    zip5 = zip.split("-")[0] ?? zip;
    zip3 = zip5.length >= 3 ? zip5.slice(0, 3) : null;
  } else {
    const zipMatch = trimmed.match(/\b(\d{5})(?:-\d{4})?\b/);
    if (zipMatch) {
      zip = zipMatch[0];
      zip5 = zipMatch[1];
      zip3 = zip5.length >= 3 ? zip5.slice(0, 3) : null;
    }
    const stateMatch = trimmed.match(/\b([A-Z]{2})\b/);
    if (stateMatch && US_STATE_CODES.has(stateMatch[1].toUpperCase())) {
      state = stateMatch[1].toUpperCase();
    }
  }

  return { state, zip, zip5, zip3 };
}

/**
 * Build region_key: state code initially (e.g. "AL").
 * Later: zip3 or county.
 */
export function buildRegionKey(addr: string | null | undefined): string | null {
  const { state } = parseAddressForRegion(addr);
  return state ? state : null;
}
