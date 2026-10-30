import { prisma } from "@/lib/prisma";
import { toNum } from "@/lib/utils";

/**
 * Profit & Loss, built from real records only:
 *  - Revenue  = invoices issued in the period (not draft, not cancelled), before tax.
 *  - Expenses = recorded expenses dated in the period.
 *  - Net profit = Revenue - Expenses.
 *  - Cash view = payments received (invoice payments and advance deposits) - expenses paid.
 * Payments are never added to revenue (that would count the same sale twice), and advance deposits
 * are not revenue until they are invoiced. All dates are handled as UTC days.
 */

export type ProfitLossGroupBy = "week" | "month" | "year";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY_MS = 86_400_000;
const MAX_RANGE_DAYS = 3660;

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const pad = (n: number) => String(n).padStart(2, "0");
const isoDay = (d: Date) => d.toISOString().slice(0, 10);

/** Monday of the week containing the date (UTC). */
function weekStart(d: Date): Date {
  const day = d.getUTCDay(); // 0 = Sunday
  const diff = (day + 6) % 7;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - diff));
}

function bucketStart(d: Date, groupBy: ProfitLossGroupBy): Date {
  if (groupBy === "week") return weekStart(d);
  if (groupBy === "month") return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  return new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
}

function nextBucket(d: Date, groupBy: ProfitLossGroupBy): Date {
  if (groupBy === "week") return new Date(d.getTime() + 7 * DAY_MS);
  if (groupBy === "month") return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
  return new Date(Date.UTC(d.getUTCFullYear() + 1, 0, 1));
}

function bucketKey(d: Date, groupBy: ProfitLossGroupBy): string {
  const b = bucketStart(d, groupBy);
  if (groupBy === "year") return String(b.getUTCFullYear());
  if (groupBy === "month") return `${b.getUTCFullYear()}-${pad(b.getUTCMonth() + 1)}`;
  return isoDay(b);
}

function bucketLabel(start: Date, groupBy: ProfitLossGroupBy): string {
  if (groupBy === "year") return String(start.getUTCFullYear());
  if (groupBy === "month") return `${MONTHS[start.getUTCMonth()]} ${start.getUTCFullYear()}`;
  const end = new Date(start.getTime() + 6 * DAY_MS);
  const sameYear = start.getUTCFullYear() === end.getUTCFullYear();
  const s = `${start.getUTCDate()} ${MONTHS[start.getUTCMonth()]}${sameYear ? "" : ` ${start.getUTCFullYear()}`}`;
  return `${s} - ${end.getUTCDate()} ${MONTHS[end.getUTCMonth()]} ${end.getUTCFullYear()}`;
}

export function isGroupBy(v: string | null | undefined): v is ProfitLossGroupBy {
  return v === "week" || v === "month" || v === "year";
}

/** Returns an error text when the range cannot be used. */
export function validateRange(start: Date, end: Date): string | null {
  if (end.getTime() < start.getTime()) return "The end date is before the start date.";
  if ((end.getTime() - start.getTime()) / DAY_MS > MAX_RANGE_DAYS) return "The date range is too long (maximum 10 years).";
  return null;
}

export type ProfitLossRow = {
  key: string;
  label: string;
  revenue: number;
  expenses: number;
  netProfit: number;
  cashReceived: number;
  netCash: number;
};

export type ProfitLossResult = {
  period: { start: string; end: string; groupBy: ProfitLossGroupBy };
  totals: {
    revenue: number;
    expenses: number;
    netProfit: number;
    /** Net profit as a percentage of revenue, or null when there is no revenue. */
    marginPercent: number | null;
    cashReceived: number;
    /** Part of cashReceived that is advance deposits (not yet invoiced). */
    advanceReceived: number;
    cashPaid: number;
    netCash: number;
    invoiceCount: number;
    expenseCount: number;
  };
  rows: ProfitLossRow[];
  byCategory: Array<{ category: string; amount: number; count: number; sharePercent: number }>;
  byShipment: Array<{ shipmentId: string; shipmentRef: string; revenue: number; expenses: number; profit: number }>;
  /** Expenses that belong to no shipment (company overhead). Net profit = sum of shipment profits - overhead. */
  overheadExpenses: number;
  /** Date of the very first recorded expense (any period), so the screen can warn about missing history. */
  expensesSince: string | null;
};

export async function buildProfitLoss(opts: {
  start: Date;
  end: Date;
  groupBy: ProfitLossGroupBy;
}): Promise<ProfitLossResult> {
  const { start, end, groupBy } = opts;

  const [invoices, payments, expenses, firstExpense] = await Promise.all([
    prisma.invoice.findMany({
      where: { status: { notIn: ["DRAFT", "CANCELLED"] }, issueDate: { gte: start, lte: end } },
      select: {
        issueDate: true,
        totalAmount: true,
        taxAmount: true,
        shipmentId: true,
        shipment: { select: { referenceNumber: true } },
      },
    }),
    prisma.payment.findMany({
      where: { paymentDate: { gte: start, lte: end } },
      select: { paymentDate: true, amount: true, isAdvance: true },
    }),
    prisma.expense.findMany({
      where: { expenseDate: { gte: start, lte: end } },
      select: {
        expenseDate: true,
        amount: true,
        category: true,
        shipmentId: true,
        shipment: { select: { referenceNumber: true } },
      },
    }),
    prisma.expense.aggregate({ _min: { expenseDate: true } }),
  ]);

  // One row for every period in the range, so quiet weeks and months show as zero instead of vanishing.
  const rowMap = new Map<string, ProfitLossRow>();
  for (let b = bucketStart(start, groupBy); b.getTime() <= end.getTime(); b = nextBucket(b, groupBy)) {
    const key = bucketKey(b, groupBy);
    rowMap.set(key, { key, label: bucketLabel(b, groupBy), revenue: 0, expenses: 0, netProfit: 0, cashReceived: 0, netCash: 0 });
  }

  const shipmentMap = new Map<string, { shipmentRef: string; revenue: number; expenses: number }>();
  const shipmentEntry = (id: string, ref: string) => {
    let e = shipmentMap.get(id);
    if (!e) {
      e = { shipmentRef: ref, revenue: 0, expenses: 0 };
      shipmentMap.set(id, e);
    }
    return e;
  };

  let revenue = 0;
  for (const inv of invoices) {
    const net = toNum(inv.totalAmount) - toNum(inv.taxAmount);
    revenue += net;
    const row = rowMap.get(bucketKey(inv.issueDate, groupBy));
    if (row) row.revenue += net;
    shipmentEntry(inv.shipmentId, inv.shipment.referenceNumber).revenue += net;
  }

  let cashReceived = 0;
  let advanceReceived = 0;
  for (const pay of payments) {
    const amount = toNum(pay.amount);
    cashReceived += amount;
    if (pay.isAdvance) advanceReceived += amount;
    const row = rowMap.get(bucketKey(pay.paymentDate, groupBy));
    if (row) row.cashReceived += amount;
  }

  let totalExpenses = 0;
  let overheadExpenses = 0;
  const categoryMap = new Map<string, { amount: number; count: number }>();
  for (const ex of expenses) {
    const amount = toNum(ex.amount);
    totalExpenses += amount;
    const row = rowMap.get(bucketKey(ex.expenseDate, groupBy));
    if (row) row.expenses += amount;
    const c = categoryMap.get(ex.category) ?? { amount: 0, count: 0 };
    c.amount += amount;
    c.count += 1;
    categoryMap.set(ex.category, c);
    if (ex.shipmentId && ex.shipment) shipmentEntry(ex.shipmentId, ex.shipment.referenceNumber).expenses += amount;
    else overheadExpenses += amount;
  }

  const rows = Array.from(rowMap.values()).map((r) => ({
    ...r,
    revenue: round2(r.revenue),
    expenses: round2(r.expenses),
    netProfit: round2(r.revenue - r.expenses),
    cashReceived: round2(r.cashReceived),
    netCash: round2(r.cashReceived - r.expenses),
  }));

  const netProfit = round2(revenue - totalExpenses);
  return {
    period: { start: isoDay(start), end: isoDay(end), groupBy },
    totals: {
      revenue: round2(revenue),
      expenses: round2(totalExpenses),
      netProfit,
      marginPercent: revenue > 0 ? round2((netProfit / revenue) * 100) : null,
      cashReceived: round2(cashReceived),
      advanceReceived: round2(advanceReceived),
      cashPaid: round2(totalExpenses),
      netCash: round2(cashReceived - totalExpenses),
      invoiceCount: invoices.length,
      expenseCount: expenses.length,
    },
    rows,
    byCategory: Array.from(categoryMap, ([category, v]) => ({
      category,
      amount: round2(v.amount),
      count: v.count,
      sharePercent: totalExpenses > 0 ? round2((v.amount / totalExpenses) * 100) : 0,
    })).sort((a, b) => b.amount - a.amount),
    byShipment: Array.from(shipmentMap, ([shipmentId, v]) => ({
      shipmentId,
      shipmentRef: v.shipmentRef,
      revenue: round2(v.revenue),
      expenses: round2(v.expenses),
      profit: round2(v.revenue - v.expenses),
    })).sort((a, b) => b.profit - a.profit),
    overheadExpenses: round2(overheadExpenses),
    expensesSince: firstExpense._min.expenseDate ? isoDay(firstExpense._min.expenseDate) : null,
  };
}

/** Revenue, expenses and profit of one shipment (all time), using the same rules as the Profit & Loss report. */
export async function buildShipmentProfit(shipmentId: string) {
  const [invoices, expenses] = await Promise.all([
    prisma.invoice.findMany({
      where: { shipmentId, status: { notIn: ["DRAFT", "CANCELLED"] } },
      select: { totalAmount: true, taxAmount: true },
    }),
    prisma.expense.aggregate({ where: { shipmentId }, _sum: { amount: true }, _count: true }),
  ]);
  const revenue = invoices.reduce((sum, i) => sum + toNum(i.totalAmount) - toNum(i.taxAmount), 0);
  const totalExpenses = toNum(expenses._sum.amount);
  return {
    revenue: round2(revenue),
    expenses: round2(totalExpenses),
    profit: round2(revenue - totalExpenses),
    invoiceCount: invoices.length,
    expenseCount: expenses._count,
  };
}
