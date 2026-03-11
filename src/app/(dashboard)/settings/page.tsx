"use client";

import * as React from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { useSettings } from "@/hooks/useSettings";
import { useAuth } from "@/hooks/useAuth";
import {
  Building2,
  FileText,
  Mail,
  Coins,
  Bell,
  Server,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { CompanyProfileTab } from "@/components/settings/CompanyProfileTab";
import { InvoiceSettingsTab } from "@/components/settings/InvoiceSettingsTab";
import { EmailSettingsTab } from "@/components/settings/EmailSettingsTab";
import { CurrencyTaxTab } from "@/components/settings/CurrencyTaxTab";
import { NotificationsTab } from "@/components/settings/NotificationsTab";
import { SystemTab } from "@/components/settings/SystemTab";

export default function SettingsPage() {
  const { hasAnyRole, user } = useAuth();
  const canAccess = hasAnyRole(["SUPER_ADMIN", "ADMIN"]);
  const isSuperAdmin = hasAnyRole(["SUPER_ADMIN"]);

  if (!user) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className="space-y-6">
        <PageHeader title="Settings" />
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <p className="text-muted-foreground text-center">
              You do not have permission to access settings. Contact an administrator.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" />
      <SettingsTabs isSuperAdmin={isSuperAdmin} />
    </div>
  );
}

function SettingsTabs({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const { settings, isLoading, isError, error, refetch, getSetting, updateSettings, isUpdating } =
    useSettings();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-destructive mb-2">Failed to load settings</p>
          <p className="text-sm text-muted-foreground mb-4">{String(error)}</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="text-sm text-primary hover:underline"
          >
            Retry
          </button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Tabs defaultValue="company" className="space-y-4">
      <TabsList className="flex flex-wrap gap-1 h-auto p-1">
        <TabsTrigger value="company" className="gap-2">
          <Building2 className="h-4 w-4" /> Company Profile
        </TabsTrigger>
        <TabsTrigger value="invoice" className="gap-2">
          <FileText className="h-4 w-4" /> Invoice Settings
        </TabsTrigger>
        <TabsTrigger value="email" className="gap-2">
          <Mail className="h-4 w-4" /> Email Settings
        </TabsTrigger>
        <TabsTrigger value="currency" className="gap-2">
          <Coins className="h-4 w-4" /> Currency & Tax
        </TabsTrigger>
        <TabsTrigger value="notifications" className="gap-2">
          <Bell className="h-4 w-4" /> Notifications
        </TabsTrigger>
        {isSuperAdmin && (
          <TabsTrigger value="system" className="gap-2">
            <Server className="h-4 w-4" /> System
          </TabsTrigger>
        )}
      </TabsList>

      <TabsContent value="company" className="space-y-4">
        <CompanyProfileTab
          settings={settings}
          getSetting={getSetting}
          updateSettings={updateSettings}
          isUpdating={isUpdating}
        />
      </TabsContent>
      <TabsContent value="invoice" className="space-y-4">
        <InvoiceSettingsTab
          settings={settings}
          getSetting={getSetting}
          updateSettings={updateSettings}
          isUpdating={isUpdating}
        />
      </TabsContent>
      <TabsContent value="email" className="space-y-4">
        <EmailSettingsTab
          settings={settings}
          getSetting={getSetting}
          updateSettings={updateSettings}
          isUpdating={isUpdating}
        />
      </TabsContent>
      <TabsContent value="currency" className="space-y-4">
        <CurrencyTaxTab
          settings={settings}
          getSetting={getSetting}
          updateSettings={updateSettings}
          isUpdating={isUpdating}
        />
      </TabsContent>
      <TabsContent value="notifications" className="space-y-4">
        <NotificationsTab />
      </TabsContent>
      {isSuperAdmin && (
        <TabsContent value="system" className="space-y-4">
          <SystemTab />
        </TabsContent>
      )}
    </Tabs>
  );
}
