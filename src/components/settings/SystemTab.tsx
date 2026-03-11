"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { useSettings } from "@/hooks/useSettings";
import { SETTING_KEYS } from "@/lib/settings";
import toast from "react-hot-toast";
import { Loader2, Database, RefreshCw, Trash2 } from "lucide-react";

export function SystemTab() {
  const { getSetting, updateSettings, isUpdating } = useSettings();
  const [retentionMonths, setRetentionMonths] = React.useState("");
  const [overdueRunning, setOverdueRunning] = React.useState(false);
  const [clearRunning, setClearRunning] = React.useState(false);

  React.useEffect(() => {
    setRetentionMonths(getSetting(SETTING_KEYS.DATA_RETENTION_MONTHS, "24"));
  }, [getSetting]);

  const handleSaveRetention = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateSettings({ [SETTING_KEYS.DATA_RETENTION_MONTHS]: retentionMonths });
      toast.success("Data retention setting saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    }
  };

  const handleRunOverdue = async () => {
    setOverdueRunning(true);
    try {
      const res = await fetch("/api/settings/run-overdue-check", { method: "POST" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.message ?? "Failed");
      }
      const data = await res.json();
      toast.success(`Overdue check completed. ${data.updated ?? 0} invoice(s) updated.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Overdue check failed");
    } finally {
      setOverdueRunning(false);
    }
  };

  const handleClearNotifications = async () => {
    if (!confirm("Clear all notification history for all users? This cannot be undone.")) return;
    setClearRunning(true);
    try {
      const res = await fetch("/api/settings/clear-notifications", { method: "POST" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.message ?? "Failed");
      }
      const data = await res.json();
      toast.success(`Cleared ${data.deleted ?? 0} notification(s).`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Clear failed");
    } finally {
      setClearRunning(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Data retention</CardTitle>
          <p className="text-sm text-muted-foreground">Policy for how long to keep data (months). Informational only; actual cleanup may be configured elsewhere.</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveRetention} className="flex gap-2 items-end">
            <div className="space-y-2 w-32">
              <Label>Months</Label>
              <Input type="number" min={1} value={retentionMonths} onChange={(e) => setRetentionMonths(e.target.value)} />
            </div>
            <Button type="submit" disabled={isUpdating}>Save</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Overdue check</CardTitle>
          <p className="text-sm text-muted-foreground">Run the manual overdue invoice check now. Marks SENT/PARTIALLY_PAID invoices past due as OVERDUE and creates notifications.</p>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={handleRunOverdue} disabled={overdueRunning}>
            {overdueRunning ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Run overdue check
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Database backup</CardTitle>
          <p className="text-sm text-muted-foreground">Backups are typically managed by your hosting or database provider. Configure automated backups in your infrastructure.</p>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground flex items-center gap-2">
            <Database className="h-4 w-4" />
            No built-in backup tool. Use pg_dump or your provider&apos;s backup feature.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>System version</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">IE Manager v0.1.0</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Clear notification history</CardTitle>
          <p className="text-sm text-muted-foreground">Delete all notifications for all users. Use to reset notification state.</p>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={handleClearNotifications} disabled={clearRunning} className="text-destructive hover:text-destructive">
            {clearRunning ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
            Clear all notifications
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
