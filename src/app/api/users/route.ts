import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/auth-helpers";
import { createUserSchema } from "@/lib/validations";
import { sendWelcomeEmail } from "@/lib/email";
import type { UserRole } from "@/types";
import type { PaginatedResponse, UserListItem } from "@/types";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

async function getHandler(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, parseInt(searchParams.get("pageSize") ?? String(DEFAULT_PAGE_SIZE), 10))
    );
    const skip = (page - 1) * pageSize;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          avatar: true,
          lastLogin: true,
          createdAt: true,
        },
      }),
      prisma.user.count(),
    ]);

    const data: UserListItem[] = users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role as UserRole,
      isActive: u.isActive,
      avatar: u.avatar,
      lastLogin: u.lastLogin,
      createdAt: u.createdAt,
    }));

    const response: PaginatedResponse<UserListItem> = {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      hasMore: skip + users.length < total,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("GET /api/users:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to list users" },
      { status: 500 }
    );
  }
}

async function postHandler(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Bad Request", message: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, email, password, role, forcePasswordChangeOnFirstLogin } = parsed.data;
    const normalizedEmail = email.trim().toLowerCase();

    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Conflict", message: "A user with this email already exists" },
        { status: 409 }
      );
    }

    const hashedPassword = await hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        password: hashedPassword,
        role,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        avatar: true,
        lastLogin: true,
        createdAt: true,
      },
    });

    try {
      const baseUrl =
        request.headers.get("x-forwarded-host")
          ? `${request.headers.get("x-forwarded-proto") ?? "https"}://${request.headers.get("x-forwarded-host")}`
          : process.env.NEXTAUTH_URL ?? "http://localhost:3000";
      const loginUrl = `${baseUrl}/login`;
      await sendWelcomeEmail({
        to: user.email,
        name: user.name,
        temporaryPassword: password,
        forcePasswordChange: forcePasswordChangeOnFirstLogin,
        loginUrl,
      });
    } catch (emailErr) {
      console.warn("Welcome email failed:", emailErr);
    }

    return NextResponse.json(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        avatar: user.avatar,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/users:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to create user" },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getHandler, { roles: ["SUPER_ADMIN", "ADMIN"] });
export const POST = withAuth(postHandler, { roles: ["SUPER_ADMIN"] });
