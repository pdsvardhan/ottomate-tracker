// Feature-verify harness — the NFC-vs-NFD unicode recipe (Task 3 §5B, the headline case).
// The real trap: a feature stores a Telugu/Tamil name and it comes back `telugu` / `_____`
// (ASCII-transliterated or mangled), or in a different normalization form than it went in.
// Functional happy-path tests never see this; system-state assertions do.

/** Non-ASCII fixtures. Send these as real user input; assert they survive intact. */
export const SCRIPT_FIXTURES = {
  telugu: 'పాట',            // "song"
  tamil: 'பாடல்',           // "song"
  hindi: 'गीत',             // "song"
  emoji: '🎵🔥',
  rtl: 'مرحبا',             // Arabic "hello" (RTL)
  mixed: 'పాట — Track 01 🎵', // mixed script + latin + emoji
  longName: 'పా'.repeat(120), // 240 codepoints of native script
} as const;

/** A string whose NFC and NFD forms differ — for "does the app canonicalise?" tests.
 *  Both are the visible text "café"; nfc has é as one codepoint (U+00E9), nfd has
 *  'e' + U+0301 (combining acute). Derived from an explicit combining sequence so no editor
 *  can silently re-normalise the literals. If the app stores nfd verbatim it is preserved but
 *  NOT canonical — a warn unless the feature spec requires NFC storage. */
export const NORMALIZATION_PAIR: { nfc: string; nfd: string } = {
  nfc: 'café'.normalize('NFC'), // café  (é precomposed)
  nfd: 'café'.normalize('NFD'), // café  (e + combining acute)
};

/** True if the string contains any codepoint outside ASCII (> U+007F). */
function hasNonAscii(s: string): boolean {
  for (const ch of s) {
    if ((ch.codePointAt(0) ?? 0) > 0x7f) return true;
  }
  return false;
}

/** U+FFFD replacement char, or a run of ASCII substitution marks where native script belonged. */
function looksMangled(s: string): boolean {
  if (s.includes('�')) return true;
  return /_{2,}|\?{2,}/.test(s);
}

export interface UnicodeCheck {
  ok: boolean;              // codepoints preserved (the critical signal)
  canonicalNfc: boolean;    // stored value is already in NFC (nice-to-have unless spec requires it)
  transliterated: boolean;  // native script was replaced with ASCII (the bug we hunt)
  mangled: boolean;         // replacement chars / substitution runs
  detail: string;
}

/**
 * Assert a stored value preserved a non-ASCII input.
 *  - CRITICAL: codepoints preserved — stored.normalize('NFC') === expected.normalize('NFC').
 *  - flag (not fail unless spec demands): stored already canonical NFC.
 *  - fail: transliterated (Telugu -> "telugu") or mangled (`_____` / U+FFFD).
 * The caller maps this to pass/warn/fail (fail-closed: transliterated/mangled/codepoint-loss = fail).
 */
export function assertNfcPreserved(stored: string, expected: string): UnicodeCheck {
  const codepointsPreserved = stored.normalize('NFC') === expected.normalize('NFC');
  const canonicalNfc = stored === stored.normalize('NFC');
  const transliterated = hasNonAscii(expected) && !hasNonAscii(stored);
  const mangled = looksMangled(stored);
  const ok = codepointsPreserved && !transliterated && !mangled;
  let detail: string;
  if (transliterated) detail = `TRANSLITERATED: "${expected}" -> "${stored}" (native script lost)`;
  else if (mangled) detail = `MANGLED: "${stored}" contains replacement/substitution marks`;
  else if (!codepointsPreserved) detail = `CODEPOINT LOSS: stored "${stored}" != expected "${expected}"`;
  else detail = `preserved${canonicalNfc ? ' (NFC)' : ' (non-canonical form stored verbatim)'}`;
  return { ok, canonicalNfc, transliterated, mangled, detail };
}
