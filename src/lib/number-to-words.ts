const ONES = [
  "Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
  "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
const SCALES = ["", "Thousand", "Million", "Billion", "Trillion"];

/** 0-999 in words (no "Zero"; callers handle that). */
function belowThousand(n: number): string {
  const parts: string[] = [];
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  if (hundreds > 0) parts.push(`${ONES[hundreds]} Hundred`);
  if (rest > 0) {
    if (rest < 20) parts.push(ONES[rest]);
    else {
      const tens = TENS[Math.floor(rest / 10)];
      const unit = rest % 10;
      parts.push(unit ? `${tens} ${ONES[unit]}` : tens);
    }
  }
  return parts.join(" ");
}

/** A whole number in words, e.g. 125 -> "One Hundred Twenty Five". */
export function integerToWords(value: number): string {
  let n = Math.floor(Math.abs(value));
  if (n === 0) return "Zero";
  if (n >= 1e15) return String(n); // beyond what an invoice can reasonably hold
  const groups: string[] = [];
  let scale = 0;
  while (n > 0) {
    const chunk = n % 1000;
    if (chunk > 0) {
      const words = belowThousand(chunk);
      groups.unshift(SCALES[scale] ? `${words} ${SCALES[scale]}` : words);
    }
    n = Math.floor(n / 1000);
    scale++;
  }
  return groups.join(" ");
}

/**
 * An amount in words, e.g. 125 -> "One Hundred Twenty Five AED",
 * 85000.5 -> "Eighty Five Thousand AED and Fifty Fils".
 */
export function amountInWords(amount: number, currency = "AED", subunit = "Fils"): string {
  if (!Number.isFinite(amount)) return "";
  const cents = Math.round((Math.abs(amount) + Number.EPSILON) * 100);
  const whole = Math.floor(cents / 100);
  const fraction = cents % 100;
  const main = `${integerToWords(whole)} ${currency}`;
  return fraction > 0 ? `${main} and ${integerToWords(fraction)} ${subunit}` : main;
}
