import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { toNum } from "@/lib/utils";
import { startOfDay, differenceInDays } from "date-fns";

async function getHandler() {
  try {
    const today = startOfDay(new Date());

    const invoices = await prisma.invoice.findMany({
      where: {
        status: { in: ["SENT", "PARTIALLY_PAID", "OVERDUE"] },
      },
      select: {
        id: true,
        companyId: true,
        dueDate: true,
        balanceAmount: true,
        company: { select: { name: true } },
      },
    });

    const companyMap = new Map<
      string,
      { companyName: string; current: number; days31to60: number; days61to90: number; over90: number }
    >();

    for (const inv of invoices) {
      const balance = toNum(inv.balanceAmount);
      if (balance <= 0) continue;

      const daysOverdue = differenceInDays(today, inv.dueDate);
      let current = 0;
      let days31to60 = 0;
      let days61to90 = 0;
      let over90 = 0;

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
        companyMap.set(inv.companyId, {
          companyName: inv.company.name,
          current,
          days31to60,
          days61to90,
          over90,
        });
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
  } catch (error) {
    console.error("GET /api/transactions/aging:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to fetch aging report" },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getHandler, {
  roles: ["SUPER_ADMIN", "ADMIN", "ACCOUNTS_MANAGER"],
});
