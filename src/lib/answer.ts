/**
 * Canonical form of a free-text answer, so "The Moon", "moon" and "Moon!" match:
 * accents dropped, lowercase, a leading "the/a/an" dropped, only letters, digits and
 * single spaces kept. Works for any script (letters are kept by Unicode class).
 */
export function normalizeAnswer(raw: string): string {
  return raw
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/^(the|a|an) /, '')
    .replace(/\s+/g, ' ');
}

/** Returns an error message for an unusable guess, or null. */
export function validateGuess(text: string): string | null {
  const t = text.trim();
  if (!t) return 'Type your guess.';
  if (t.length > 60) return 'Keep it under 60 characters.';
  if (!normalizeAnswer(t)) return 'Use at least one letter or number.';
  return null;
}

/**
 * Is `guess` right for a row? It must equal one of the row's accepted forms; for rows
 * without explicit alternatives, the guess's whole words appearing in the clue also counts
 * ("Beta" for "Beta version").
 */
export function matchesRow(accepted: string[], guess: string, explicit: boolean): boolean {
  const g = normalizeAnswer(guess);
  if (!g) return false;
  if (accepted.some((a) => normalizeAnswer(a) === g)) return true;
  if (explicit || g.replace(/ /g, '').length < 3) return false;
  return accepted.some((a) => ` ${normalizeAnswer(a)} `.includes(` ${g} `));
}
