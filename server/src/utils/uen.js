// Singapore Unique Entity Number (UEN) validation.
//
// ACRA issues three formats:
//   A. Businesses registered with ACRA        — nnnnnnnnX      (9 chars)
//   B. Local companies registered with ACRA   — yyyynnnnnX     (10 chars)
//   C. All other entities (societies, LLPs,
//      government bodies, foreign branches…)  — TyyPQnnnnX     (10 chars)
//
// Only the published *format* is checked here. ACRA does not publish the check-digit
// algorithm, so a format-valid UEN still has to be confirmed by the system admin
// against the public BizFile register before the organisation is approved.

// A: 8 digits + 1 check letter
const FORMAT_A = /^\d{8}[A-Z]$/;

// B: 4-digit year of issue + 5 digits + 1 check letter
const FORMAT_B = /^(19|20)\d{2}\d{5}[A-Z]$/;

// C: T|S|R + 2-digit year + 2-letter entity type + 4 digits + 1 check letter
const FORMAT_C = /^[TSR]\d{2}[A-Z]{2}\d{4}[A-Z]$/;

// Entity-type codes accepted in the third UEN format (ACRA/other-agency issued).
const ENTITY_TYPES = new Set([
  'LP', 'LL', 'FC', 'PF', 'RF', 'MQ', 'MM', 'NB', 'CC', 'CS', 'MB', 'FM',
  'GS', 'GA', 'GB', 'DP', 'CP', 'NR', 'CM', 'CD', 'MD', 'HS', 'VH', 'CH',
  'MH', 'CL', 'XL', 'CX', 'GC', 'RP', 'TU', 'TC', 'FB',
  'FN', 'PA', 'PB', 'SS', 'MC', 'SM',
]);

function normaliseUEN(uen) {
  return String(uen ?? '').trim().toUpperCase().replace(/[\s-]/g, '');
}

/**
 * @returns {{ valid: boolean, uen?: string, format?: 'A'|'B'|'C', reason?: string }}
 */
function validateUEN(input) {
  const uen = normaliseUEN(input);

  if (!uen) return { valid: false, reason: 'UEN is required.' };
  if (uen.length < 9 || uen.length > 10) {
    return { valid: false, reason: 'A UEN is 9 or 10 characters long.' };
  }

  if (FORMAT_A.test(uen)) return { valid: true, uen, format: 'A' };
  if (FORMAT_B.test(uen)) return { valid: true, uen, format: 'B' };

  if (FORMAT_C.test(uen)) {
    const entityType = uen.slice(3, 5);
    if (!ENTITY_TYPES.has(entityType)) {
      return { valid: false, reason: `"${entityType}" is not a recognised UEN entity-type code.` };
    }
    return { valid: true, uen, format: 'C' };
  }

  return {
    valid: false,
    reason: 'That is not a valid UEN. Expected formats: 12345678A, 201512345A, or T09LL0001B.',
  };
}

module.exports = { validateUEN, normaliseUEN };
