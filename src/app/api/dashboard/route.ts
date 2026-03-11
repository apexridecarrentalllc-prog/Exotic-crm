import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startOfMonth, endOfMonth, subMonths } from "date-fns";

function toNum(d: unknown): number {
  if (d == null) return 0;
  if (typeof d === "number" && !Number.isNaN(d)) return d;
  if (typeof d === "object" && d !== null && "toNumber" in d && typeof (d as { toNumber: () => number }).toNumber === "function") {
    return (d as { toNumber: () => number }).toNumber();
  }
  const n = Number(d);
  return Number.isNaN(n) ? 0 : n;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const thisMonthStart = startOfMonth(now);
  const thisMonthEnd = endOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = endOfMonth(subMonths(now, 1));

  try {
    const [
      activeShipmentsCount,
      totalInvoicedThisMonthAgg,
      totalCollectedThisMonthAgg,
      outstandingAgg,
      overdueInvoicesCount,
      shipmentsThisMonthCount,
      lastMonthInvoicedAgg,
      recentShipmentsRaw,
      overdueInvoicesRaw,
      shipmentsByStatusRaw,
      topCompaniesRaw,
    ] = await Promise.all([
      prisma.shipment.count({
        where: {
          status: { notIn: ["DELIVERED", "CLOSED"] },
        },
      }),
      prisma.invoice.aggregate({
        where: {
          issueDate: { gte: thisMonthStart, lte: thisMonthEnd },
          status: { not: "CANCELLED" },
        },
        _sum: { totalAmount: true },
      }),
      prisma.payment.aggregate({
        where: { paymentDate: { gte: thisMonthStart, lte: thisMonthEnd } },
        _sum: { amount: true },
      }),
      prisma.invoice.aggregate({
        where: {
          status: { in: ["SENT", "PARTIALLY_PAID", "OVERDUE"] },
        },
        _sum: { balanceAmount: true },
      }),
      prisma.invoice.count({ where: { status: "OVERDUE" } }),
      prisma.shipment.count({
        where: {
          OR: [
            { orderDate: { gte: thisMonthStart, lte: thisMonthEnd } },
            { createdAt: { gte: thisMonthStart, lte: thisMonthEnd } },
          ],
        },
      }),
      prisma.invoice.aggregate({
        where: {
          issueDate: { gte: lastMonthStart, lte: lastMonthEnd },
          status: { not: "CANCELLED" },
        },
        _sum: { totalAmount: true },
      }),
      prisma.shipment.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          invoices: {
            take: 1,
            include: { company: { select: { name: true } } },
          },
        },
      }),
      prisma.invoice.findMany({
        where: { status: "OVERDUE" },
        take: 5,
        orderBy: { dueDate: "asc" },
        include: { company: { select: { name: true } } },
      }),
      prisma.shipment.groupBy({
        by: ["status"],
        _count: { id: true },
      }),
      prisma.invoice.groupBy({
        by: ["companyId"],
        where: { status: { not: "CANCELLED" } },
        _sum: { totalAmount: true },
      }),
    ]);

    const totalInvoicedThisMonth = toNum(totalInvoicedThisMonthAgg._sum.totalAmount);
    const totalCollectedThisMonth = toNum(totalCollectedThisMonthAgg._sum.amount);
    const totalOutstanding = toNum(outstandingAgg._sum.balanceAmount);
    const lastMonthInvoiced = toNum(lastMonthInvoicedAgg._sum.totalAmount);
    const revenueGrowth =
      lastMonthInvoiced > 0
        ? Math.round(((totalInvoicedThisMonth - lastMonthInvoiced) / lastMonthInvoiced) * 100)
        : totalInvoicedThisMonth > 0 ? 100 : 0;

    const shipmentIds = await prisma.shipment.findMany({ select: { id: true } });
    const docsByShipment = await prisma.document.groupBy({
      by: ["shipmentId"],
      _count: { id: true },
    });
    const shipmentIdsWithDocs = new Set(docsByShipment.map((d) => d.shipmentId));
    const pendingDocuments = shipmentIds.filter((s) => !shipmentIdsWithDocs.has(s.id)).length;

    const recentShipments = recentShipmentsRaw.map((s) => ({
      id: s.id,
      referenceNumber: s.referenceNumber,
      type: s.type,
      status: s.status,
      origin: s.origin,
      destination: s.destination,
      createdAt: s.createdAt.toISOString(),
      companyNames: Array.from(new Set(s.invoices.map((i) => i.company.name))).join(", ") || "—",
    }));

    const overdueInvoicesList = overdueInvoicesRaw.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      companyName: inv.company.name,
      balanceAmount: toNum(inv.balanceAmount),
      currency: inv.currency,
      dueDate: inv.dueDate.toISOString(),
    }));

    const monthlyRevenue: { month: string; invoiced: number; collected: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = subMonths(now, i);
      const mStart = startOfMonth(d);
      const mEnd = endOfMonth(d);
      const [inv, col] = await Promise.all([
        prisma.invoice.aggregate({
          where: {
            issueDate: { gte: mStart, lte: mEnd },
            status: { not: "CANCELLED" },
          },
          _sum: { totalAmount: true },
        }),
        prisma.payment.aggregate({
          where: { paymentDate: { gte: mStart, lte: mEnd } },
          _sum: { amount: true },
        }),
      ]);
      monthlyRevenue.push({
        month: mStart.toISOString().slice(0, 7),
        invoiced: toNum(inv._sum.totalAmount),
        collected: toNum(col._sum.amount),
      });
    }

    const shipmentsByStatus = shipmentsByStatusRaw.map((s) => ({
      status: s.status,
      count: s._count.id,
    }));

    const sortedTopCompanies = [...topCompaniesRaw].sort(
      (a, b) => toNum(b._sum.totalAmount) - toNum(a._sum.totalAmount)
    );
    const companyIds = sortedTopCompanies.slice(0, 5).map((c) => c.companyId);
    const companies = await prisma.company.findMany({
      where: { id: { in: companyIds } },
      select: { id: true, name: true },
    });
    const companyMap = new Map(companies.map((c) => [c.id, c.name]));
    const topCompaniesByRevenue = sortedTopCompanies.slice(0, 5).map((c) => ({
      companyId: c.companyId,
      companyName: companyMap.get(c.companyId) ?? "—",
      totalInvoiced: toNum(c._sum.totalAmount),
    }));

    return NextResponse.json({
      stats: {
        activeShipments: activeShipmentsCount,
        totalInvoicedThisMonth,
        totalCollectedThisMonth,
        totalOutstanding,
        overdueInvoices: overdueInvoicesCount,
        pendingDocuments,
        shipmentsThisMonth: shipmentsThisMonthCount,
        revenueGrowth,
      },
      recentShipments,
      overdueInvoicesList,
      monthlyRevenue,
      shipmentsByStatus,
      topCompaniesByRevenue,
    });
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json(
      { error: "Failed to load dashboard data" },
      { status: 500 }
    );
  }
}
