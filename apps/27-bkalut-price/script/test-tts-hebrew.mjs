#!/usr/bin/env node
// Smoke test for the Hebrew TTS-safe formatter.
// Run with: node --import tsx/esm script/test-tts-hebrew.mjs
//
// Verifies that podcast/voice script text is normalized for Hebrew TTS:
// currency amounts, percents, years and bare numbers are converted to
// Hebrew words; whitespace/punctuation is cleaned up; underlying API
// numeric data is NEVER affected (that is handled by callers — this
// formatter is presentation-only).

import { toTtsSafeHebrew, hebrewNumberWords, hebrewCurrencyWords, cleanVoiceScriptText } from "../shared/tts-hebrew.ts";

let failed = 0;
function assert(name, actual, expectedSubstring) {
  const ok = typeof expectedSubstring === "string"
    ? String(actual).includes(expectedSubstring)
    : expectedSubstring.test(String(actual));
  if (!ok) {
    failed++;
    console.error(`FAIL ${name}\n  actual:   ${JSON.stringify(actual)}\n  expected: ${expectedSubstring}`);
  } else {
    console.log(`ok   ${name}`);
  }
}

assert("number 50", hebrewNumberWords(50), "חמישים");
assert("number 100", hebrewNumberWords(100), "מאה");
assert("number 1500", hebrewNumberWords(1500), "אלף");
assert("currency 50 ש\"ח", hebrewCurrencyWords(50), "חמישים שקלים");
assert("currency 1 שקל", hebrewCurrencyWords(1), "שקל אחד");

assert("50 ש\"ח in text", toTtsSafeHebrew("הסכום הוא 50 ש\"ח"), "חמישים שקלים");
assert("100 ש\"ח in text", toTtsSafeHebrew("עלות 100 ש\"ח לחודש"), "מאה שקלים");
assert("₪ before amount", toTtsSafeHebrew("מחיר ₪250"), "מאתיים");
assert("10% in text", toTtsSafeHebrew("הנחה של 10%"), "עשרה אחוזים");
assert("year 2026", toTtsSafeHebrew("בשנת 2026 ייפתח"), "אלפיים");
assert("standalone number", toTtsSafeHebrew("גיל 18 ומעלה"), "שמונה עשר");

// Cleanup: multiple spaces collapsed; line breaks preserved.
const messy = "שלום   לך,זה משפט.עכשיו  עוד אחד.\n\n\n\nפיסקה חדשה";
const cleaned = cleanVoiceScriptText(messy);
assert("collapses spaces", cleaned, "שלום לך,");
assert("space after period", cleaned, "משפט. עכשיו");
assert("collapses 3+ newlines", /\n\n[^\n]/u.test(cleaned) && !/\n\n\n/.test(cleaned) ? "ok" : "no", "ok");

// Non-voice fields should be untouched by callers — but formatter must not
// blow up on empty/null input.
assert("empty string", toTtsSafeHebrew(""), "");
assert("null", toTtsSafeHebrew(null), "");
assert("undefined", toTtsSafeHebrew(undefined), "");

// Heading-like line gets a paragraph break after the colon.
const withHeading = "תנאי זכאות:\nגיל 18 ומעלה\nתושב ישראל";
const headingOut = toTtsSafeHebrew(withHeading);
assert("heading paragraph break", headingOut, "תנאי זכאות:\n\n");

if (failed > 0) {
  console.error(`\n${failed} test(s) failed.`);
  process.exit(1);
}
console.log("\nAll TTS-safe Hebrew formatter tests passed.");
