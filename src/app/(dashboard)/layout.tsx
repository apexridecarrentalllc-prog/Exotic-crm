import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { DashboardProviders } from "@/components/layout/DashboardProviders";

export const metadata: Metadata = {
  title: { template: "%s | Exotic Food Stuff", default: "Dashboard | Exotic Food Stuff" },
  description: "Food Stuff Business Management System",
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
