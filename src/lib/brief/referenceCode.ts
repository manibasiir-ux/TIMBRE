/**
 * Brief reference code, FR-18. Format TMB-YYMMDD-XXX.
 *
 * The code is quoted back in the confirmation screen, the autoresponder and the
 * Slack alert, so it has to be stable in shape and easy to read aloud on a call.
 * Date and randomness are injected rather than reached for, so the format can
 * be asserted deterministically.
 */

/**
 * Deliberately excludes I, O, 0 and 1. The code gets read over the phone and
 * retyped, and those four are where transcription errors come from.
 */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export const REFERENCE_CODE_PATTERN = /^TMB-\d{6}-[A-Z2-9]{3}$/;

export function generateReferenceCode(
  now: Date = new Date(),
  random: () => number = Math.random,
): string {
  // UTC throughout: the studio takes briefs from any timezone, and a code whose
  // date shifts with the submitter's locale is a support conversation.
  const yy = String(now.getUTCFullYear() % 100).padStart(2, "0");
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");

  let suffix = "";
  for (let i = 0; i < 3; i += 1) {
    const index = Math.floor(random() * ALPHABET.length) % ALPHABET.length;
    suffix += ALPHABET[index];
  }

  return `TMB-${yy}${mm}${dd}-${suffix}`;
}

export function isValidReferenceCode(code: string): boolean {
  return REFERENCE_CODE_PATTERN.test(code);
}
