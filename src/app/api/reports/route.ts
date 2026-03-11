import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { toNum } from "@/lib/utils";
import { parseISO, isValid, startOfMonth, endOfMonth, startOfYear, endOfYear, differenceInDays } from "date-fns";

const REPORT_TYPES = [
  "monthly_revenue",
  "company_billing",
  "shipment_volume",
  "outstanding_aging",
  "profit_overview",
  "ytd_summary",
  "tax_report",
  "import_export_breakdown",
] as const;

function parseDateRange(startParam: string | null, endParam: string | null, yearOnly?: boolean) {
  let start: Date;
  let end: Date;
  if (yearOnly && endParam) {
    const y = parseInt(endParam.slice(0, 4), 10);
    if (!isNaN(y)) {
      start = startOfYear(new Date(y, 0, 1));
      end = endOfYear(new Date(y, 11, 31));
      return { start, end };
    }
  }
  if (startParam) {
    const d = parseISO(startParam);
    start = isValid(d) ? startOfMonth(d) : startOfMonth(new Date());
  } else {
    const n = new Date();
    start = startOfMonth(new Date(n.getFullYear(), n.getMonth() - 11, 1));
  }
  if (endParam) {
    const d = parseISO(endParam);
    end = isValid(d) ? endOfMonth(d) : endOfMonth(new Date());
  } else {
    end = endOfMonth(new Date());
  }
  return { start, end };
}

async function getHandler(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get("reportType") as (typeof REPORT_TYPES)[number] | null;
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const companyId = searchParams.get("companyId") || undefined;

    if (!reportType || !REPORT_TYPES.includes(reportType)) {
      return NextResponse.json(
        { error: "Bad Request", message: "Valid reportType is required" },
        { status: 400 }
      );
    }

    const { start, end } = parseDateRange(startDateParam, endDateParam, reportType === "ytd_summary");

    const invoiceWhere = {
      status: { not: "CANCELLED" as const },
      ...(companyId && { companyId }),
      issueDate: { gte: start, lte: end },
    };

    const shipmentWhere = {
      ...(companyId && { stages: { some: { companyId } } }),
      orderDate: { gte: start, lte: end },
    };

    switch (reportType) {
      case "monthly_revenue": {
        const invoices = await prisma.invoice.findMany({
          where: { status: { not: "CANCELLED" }, ...(companyId && { companyId }), issueDate: { gte: start, lte: end } },
          select: { issueDate: true, totalAmount: true, balanceAmount: true, shipmentId: true },
        });
        const payments = await prisma.payment.findMany({
          where: { ...(companyId && { companyId }), paymentDate: { gte: start, lte: end } },
          select: { paymentDate: true, amount: true },
        });
        const monthMap = new Map<string, { invoiced: number; collected: number; outstanding: number; shipmentIds: Set<string> }>();
        for (const inv of invoices) {
          const key = `${inv.issueDate.getFullYear()}-${String(inv.issueDate.getMonth() + 1).padStart(2, "0")}`;
          if (!monthMap.has(key)) monthMap.set(key, { invoiced: 0, collected: 0, outstanding: 0, shipmentIds: new Set() });
          const row = monthMap.get(key)!;
          row.invoiced += toNum(inv.totalAmount);
          row.outstanding += toNum(inv.balanceAmount);
          row.shipmentIds.add(inv.shipmentId);
        }
        for (const pay of payments) {
          const key = `${pay.paymentDate.getFullYear()}-${String(pay.paymentDate.getMonth() + 1).padStart(2, "0")}`;
          if (!monthMap.has(key)) monthMap.set(key, { invoiced: 0, collected: 0, outstanding: 0, shipmentIds: new Set() });
          monthMap.get(key)!.collected += toNum(pay.amount);
        }
        const months = Array.from(monthMap.entries())
          .map(([key, row]) => {
            const [y, m] = key.split("-").map(Number);
            return { month: m, year: y, invoiced: row.invoiced, collected: row.collected, outstanding: row.outstanding, shipmentCount: row.shipmentIds.size };
          })
          .sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month);
        return NextResponse.json({ months });
      }

      case "company_billing": {
        const companies = await prisma.company.findMany({
          where: companyId ? { id: companyId } : undefined,
          select: { id: true, name: true },
        });
        const result: Array<{
          companyId: string;
          companyName: string;
          totalInvoiced: number;
          totalPaid: number;
          outstanding: number;
          invoiceCount: number;
          shipmentCount: number;
          avgPaymentDays: number;
        }> = [];
        for (const co of companies) {
          const [invAgg, payAgg, invList, payList] = await Promise.all([
            prisma.invoice.aggregate({
              where: { companyId: co.id, status: { not: "CANCELLED" }, issueDate: { gte: start, lte: end } },
              _sum: { totalAmount: true, balanceAmount: true },
              _count: true,
            }),
            prisma.payment.aggregate({
              where: { companyId: co.id, paymentDate: { gte: start, lte: end } },
              _sum: { amount: true },
            }),
            prisma.invoice.findMany({
              where: { companyId: co.id, status: { not: "CANCELLED" }, issueDate: { gte: start, lte: end } },
              select: { shipmentId: true },
            }),
            prisma.payment.findMany({
              where: { companyId: co.id, paymentDate: { gte: start, lte: end } },
              include: { invoice: { select: { issueDate: true } } },
            }),
          ]);
          const totalInvoiced = toNum(invAgg._sum.totalAmount);
          const totalPaid = toNum(payAgg._sum.amount);
          const outstanding = toNum(invAgg._sum.balanceAmount);
          const shipmentIds = new Set(invList.map((i) => i.shipmentId));
          let totalDays = 0;
          let payCount = 0;
          for (const p of payList) {
            if (p.invoice?.issueDate) {
              totalDays += differenceInDays(p.paymentDate, p.invoice.issueDate);
              payCount++;
            }
          }
          const avgPaymentDays = payCount > 0 ? Math.round(totalDays / payCount) : 0;
          result.push({
            companyId: co.id,
            companyName: co.name,
            totalInvoiced,
            totalPaid,
            outstanding,
            invoiceCount: invAgg._count,
            shipmentCount: shipmentIds.size,
            avgPaymentDays,
          });
        }
        return NextResponse.json({ companies: result });
      }

      case "shipment_volume": {
        const shipments = await prisma.shipment.findMany({
          where: shipmentWhere,
          select: { id: true, type: true, status: true, orderDate: true },
        });
        const monthMap = new Map<string, { import: number; export: number }>();
        const statusMap = new Map<string, number>();
        for (const s of shipments) {
          const key = `${s.orderDate.getFullYear()}-${String(s.orderDate.getMonth() + 1).padStart(2, "0")}`;
          if (!monthMap.has(key)) monthMap.set(key, { import: 0, export: 0 });
          const row = monthMap.get(key)!;
          if (s.type === "IMPORT") row.import++;
          else row.export++;
          statusMap.set(s.status, (statusMap.get(s.status) ?? 0) + 1);
        }
        const months = Array.from(monthMap.entries())
          .map(([key, row]) => {
            const [y, m] = key.split("-").map(Number);
            return { month: m, year: y, import: row.import, export: row.export, total: row.import + row.export };
          })
          .sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month);
        const byStatus = Array.from(statusMap.entries()).map(([status, count]) => ({ status, count }));
        return NextResponse.json({ months, byStatus });
      }

      case "outstanding_aging": {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const invoices = await prisma.invoice.findMany({
          where: { status: { in: ["SENT", "PARTIALLY_PAID", "OVERDUE"] } },
          select: { companyId: true, dueDate: true, balanceAmount: true, company: { select: { name: true } } },
        });
        const companyMap = new Map<string, { companyName: string; current: number; days31to60: number; days61to90: number; over90: number }>();
        for (const inv of invoices) {
          const balance = toNum(inv.balanceAmount);
          if (balance <= 0) continue;
          const daysOverdue = differenceInDays(today, inv.dueDate);
          let current = 0, days31to60 = 0, days61to90 = 0, over90 = 0;
          if (daysOverdue <= 30) current = balance;
          else if (daysOverdue <= 60) days31to60 = balance;
          else if (daysOverdue <= 90) days61to90 = balance;
          else over90 = balance;
          const existing = companyMap.get(inv.companyId);
          if (existing) {
            existing.current += current;
            existing.days31to60 += days31to60;
            existing.days61to90 += days61to90;
            existing.over90 += over90;
          } else {
            companyMap.set(inv.companyId, { companyName: inv.company.name, current, days31to60, days61to90, over90 });
          }
        }
        const companies = Array.from(companyMap.entries()).map(([companyId, row]) => ({
          companyId,
          companyName: row.companyName,
          current: row.current,
          days31to60: row.days31to60,
          days61to90: row.days61to90,
          over90: row.over90,
          total: row.current + row.days31to60 + row.days61to90 + row.over90,
        }));
        const totals = companies.reduce(
          (acc, c) => ({
            current: acc.current + c.current,
            days31to60: acc.days31to60 + c.days31to60,
            days61to90: acc.days61to90 + c.days61to90,
            over90: acc.over90 + c.over90,
            total: acc.total + c.total,
          }),
          { current: 0, days31to60: 0, days61to90: 0, over90: 0, total: 0 }
        );
        return NextResponse.json({ companies, totals });
      }

      case "profit_overview": {
        const shipments = await prisma.shipment.findMany({
          where: shipmentWhere,
          select: { id: true, referenceNumber: true },
        });
        const result: Array<{ shipmentRef: string; totalRevenue: number; companyCosts: number; grossMargin: number }> = [];
        for (const sh of shipments) {
          const [invSum, paySum] = await Promise.all([
            prisma.invoice.aggregate({
              where: { shipmentId: sh.id, status: { not: "CANCELLED" } },
              _sum: { totalAmount: true },
            }),
            prisma.payment.aggregate({
              where: { invoice: { shipmentId: sh.id } },
              _sum: { amount: true },
            }),
          ]);
          const totalRevenue = toNum(invSum._sum.totalAmount);
          const companyCosts = toNum(paySum._sum.amount);
          result.push({
            shipmentRef: sh.referenceNumber,
            totalRevenue,
            companyCosts,
            grossMargin: totalRevenue - companyCosts,
          });
        }
        return NextResponse.json({ shipments: result });
      }

      case "ytd_summary": {
        const year = end.getFullYear();
        const yStart = startOfYear(new Date(year, 0, 1));
        const yEnd = endOfYear(new Date(year, 11, 31));
        const [shipStats, invAgg, payAgg, invoicesForTop] = await Promise.all([
          prisma.shipment.groupBy({
            by: ["type"],
            where: { orderDate: { gte: yStart, lte: yEnd } },
            _count: true,
          }),
          prisma.invoice.aggregate({
            where: { status: { not: "CANCELLED" }, issueDate: { gte: yStart, lte: yEnd } },
            _sum: { totalAmount: true, balanceAmount: true },
          }),
          prisma.payment.aggregate({
            where: { paymentDate: { gte: yStart, lte: yEnd } },
            _sum: { amount: true },
          }),
          prisma.invoice.groupBy({
            by: ["companyId"],
            where: { status: { not: "CANCELLED" }, issueDate: { gte: yStart, lte: yEnd } },
            _sum: { totalAmount: true },
          }),
        ]);
        const importCount = shipStats.find((s) => s.type === "IMPORT")?._count ?? 0;
        const exportCount = shipStats.find((s) => s.type === "EXPORT")?._count ?? 0;
        const totalShipments = importCount + exportCount;
        const totalInvoiced = toNum(invAgg._sum.totalAmount);
        const totalCollected = toNum(payAgg._sum.amount);
        const totalOutstanding = toNum(invAgg._sum.balanceAmount);
        const companyIds = invoicesForTop.map((i) => i.companyId);
        const companyNames = companyIds.length
          ? await prisma.company.findMany({ where: { id: { in: companyIds } }, select: { id: true, name: true } })
          : [];
        const nameMap = new Map(companyNames.map((c) => [c.id, c.name]));
        const topCompanies = invoicesForTop
          .map((i) => ({ companyId: i.companyId, companyName: nameMap.get(i.companyId) ?? "", totalInvoiced: toNum(i._sum.totalAmount) }))
          .sort((a, b) => b.totalInvoiced - a.totalInvoiced)
          .slice(0, 5);
        return NextResponse.json({
          year,
          totalShipments,
          importShipments: importCount,
          exportShipments: exportCount,
          totalInvoiced,
          totalCollected,
          totalOutstanding,
          topCompanies,
        });
      }

      case "tax_report": {
        const invoices = await prisma.invoice.findMany({
          where: invoiceWhere,
          select: {
            invoiceNumber: true,
            issueDate: true,
            subtotal: true,
            taxRate: true,
            taxAmount: true,
            withholdingTax: true,
            totalAmount: true,
            company: { select: { name: true } },
          },
        });
        const items = invoices.map((inv) => ({
          period: `${inv.issueDate.getFullYear()}-${String(inv.issueDate.getMonth() + 1).padStart(2, "0")}`,
          invoiceNumber: inv.invoiceNumber,
          companyName: inv.company.name,
          subtotal: toNum(inv.subtotal),
          taxRate: toNum(inv.taxRate),
          taxAmount: toNum(inv.taxAmount),
          withholdingTax: toNum(inv.withholdingTax),
          netAmount: toNum(inv.totalAmount),
        }));
        const totalTax = items.reduce((s, i) => s + i.taxAmount, 0);
        const totalWHT = items.reduce((s, i) => s + i.withholdingTax, 0);
        return NextResponse.json({ items, totals: { totalTax, totalWHT } });
      }

      case "import_export_breakdown": {
        const [importShipments, exportShipments, importInvs, exportInvs] = await Promise.all([
          prisma.shipment.findMany({
            where: { type: "IMPORT", orderDate: { gte: start, lte: end } },
            select: { id: true },
          }),
          prisma.shipment.findMany({
            where: { type: "EXPORT", orderDate: { gte: start, lte: end } },
            select: { id: true },
          }),
          prisma.invoice.aggregate({
            where: { shipment: { type: "IMPORT" }, status: { not: "CANCELLED" }, issueDate: { gte: start, lte: end } },
            _sum: { totalAmount: true },
          }),
          prisma.invoice.aggregate({
            where: { shipment: { type: "EXPORT" }, status: { not: "CANCELLED" }, issueDate: { gte: start, lte: end } },
            _sum: { totalAmount: true },
          }),
        ]);
        const importCompanyIds = await prisma.invoice.groupBy({
          by: ["companyId"],
          where: { shipment: { type: "IMPORT" }, status: { not: "CANCELLED" }, issueDate: { gte: start, lte: end } },
          _sum: { totalAmount: true },
        });
        const exportCompanyIds = await prisma.invoice.groupBy({
          by: ["companyId"],
          where: { shipment: { type: "EXPORT" }, status: { not: "CANCELLED" }, issueDate: { gte: start, lte: end } },
          _sum: { totalAmount: true },
        });
        const allIds = [...importCompanyIds.map((c) => c.companyId), ...exportCompanyIds.map((c) => c.companyId)];
        const companies = allIds.length ? await prisma.company.findMany({ where: { id: { in: allIds } }, select: { id: true, name: true } }) : [];
        const nameMap = new Map(companies.map((c) => [c.id, c.name]));
        const topImport = importCompanyIds
          .map((c) => ({ companyId: c.companyId, companyName: nameMap.get(c.companyId) ?? "", value: toNum(c._sum.totalAmount) }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 5);
        const topExport = exportCompanyIds
          .map((c) => ({ companyId: c.companyId, companyName: nameMap.get(c.companyId) ?? "", value: toNum(c._sum.totalAmount) }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 5);
        return NextResponse.json({
          import: { count: importShipments.length, value: toNum(importInvs._sum.totalAmount), topCompanies: topImport },
          export: { count: exportShipments.length, value: toNum(exportInvs._sum.totalAmount), topCompanies: topExport },
        });
      }

      default:
        return NextResponse.json({ error: "Bad Request", message: "Unknown report type" }, { status: 400 });
    }
  } catch (error) {
    console.error("GET /api/reports:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to generate report" },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getHandler, {
  roles: ["SUPER_ADMIN", "ADMIN", "ACCOUNTS_MANAGER"],
});
