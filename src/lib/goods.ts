/** Longest goods text shown on invoices, statements and ledger rows. Longer text ends in "…". */
export const GOODS_DISPLAY_MAX = 200;

/** The invoice has a wide box and is a legal document, so it shows more (about 14 containers fit in full). */
export const INVOICE_GOODS_MAX = 800;

export function truncateGoods(text: string | null | undefined, max = GOODS_DISPLAY_MAX): string {
  const clean = (text ?? "").replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max).trimEnd()}…` : clean;
}

/**
 * For PDFs: puts a line break inside any single word longer than `chunk` characters (for example many
 * container numbers run together), so it wraps inside its cell instead of spilling over other columns or
 * past the page edge. Normal text with spaces is left as it is.
 */
export function breakLongWords(text: string, chunk: number): string {
  return text.replace(/\S+/g, (word) =>
    word.length > chunk ? (word.match(new RegExp(`.{1,${chunk}}`, "g")) ?? [word]).join("\n") : word
  );
}
