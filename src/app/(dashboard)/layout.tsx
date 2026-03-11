import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { DashboardProviders } from "@/components/layout/DashboardProviders";

export const metadata: Metadata = {
  title: { template: "%s | IE Manager", default: "Dashboard | IE Manager" },
  description: "Import/Export Business Management System",
};

export default async function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  return <DashboardProviders>{children}</DashboardProviders>;
}
