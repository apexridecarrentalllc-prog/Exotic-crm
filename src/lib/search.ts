/**
 * Makes user-typed search text safe for Prisma's case-insensitive `contains` on MongoDB.
 * That filter hands the text to the database as a regular expression, so characters such as
 * ( ) [ * + ? . | would break the query (a 500 error) or match more than the user typed.
 * Escaping them turns the text into plain text.
 */
export function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
