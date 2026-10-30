/** Expense categories shown in the Expenses screen and used by the Profit & Loss report. */
export const EXPENSE_CATEGORIES = [
  "Freight & Shipping",
  "Customs & Duties",
  "Port & Handling",
  "Transport & Trucking",
  "Warehousing & Storage",
  "Salaries & Wages",
  "Rent & Utilities",
  "Fuel",
  "Office & Admin",
  "Marketing",
  "Government & Licences",
  "Bank Charges",
  "Maintenance & Repairs",
  "Other",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const EXPENSE_METHODS = ["CASH", "BANK_TRANSFER", "CHEQUE", "ONLINE"] as const;

export const EXPENSE_METHOD_LABELS: Record<(typeof EXPENSE_METHODS)[number], string> = {
  CASH: "Cash",
  BANK_TRANSFER: "Bank transfer",
  CHEQUE: "Cheque",
  ONLINE: "Online",
};
