import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 20;

async function getHandler(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") ?? "").trim();
    const limitParam = searchParams.get("limit");
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, parseInt(limitParam ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT)
    );

    if (!q || q.length < 2) {
      return NextResponse.json({
        shipments: [],
        companies: [],
        invoices: [],
        total: 0,
      });
    }

    const mode = "insensitive" as const;

    const [shipments, companies, invoices] = await Promise.all([
      prisma.shipment.findMany({
        where: {
          OR: [
            { referenceNumber: { contains: q, mode } },
            { containerNumber: { contains: q, mode } },
            { awbNumber: { contains: q, mode } },
            { goodsDescription: { contains: q, mode } },
          ],
        },
        take: limit,
        select: {
          id: true,
          referenceNumber: true,
          type: true,
          status: true,
          origin: true,
          destination: true,
        },
      }),
      prisma.company.findMany({
        where: { name: { contains: q, mode } },
        take: limit,
        select: {
          id: true,
          name: true,
          type: true,
          isActive: true,
        },
      }),
      prisma.invoice.findMany({
        where: { invoiceNumber: { contains: q, mode } },
        take: limit,
        select: {
          id: true,
          invoiceNumber: true,
          status: true,
          totalAmount: true,
          company: { select: { name: true } },
        },
      }),
    ]);

    const total = shipments.length + companies.length + invoices.length;

    return NextResponse.json({
      shipments: shipments.map((s) => ({
        id: s.id,
        referenceNumber: s.referenceNumber,
        type: s.type,
        status: s.status,
        origin: s.origin,
        destination: s.destination,
      })),
      companies: companies.map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        isActive: c.isActive,
      })),
      invoices: invoices.map((i) => ({
        id: i.id,
        invoiceNumber: i.invoiceNumber,
        status: i.status,
        totalAmount: Number(i.totalAmount),
        companyName: i.company.name,
      })),
      total,
    });
  } catch (error) {
    console.error("GET /api/search:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Search failed" },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getHandler);
