"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { SETTING_KEYS } from "@/lib/settings";
import toast from "react-hot-toast";
import { Loader2, Send } from "lucide-react";
import { Switch } from "@/components/ui/Switch";

type Props = {
  settings: Record<string, string>;
  getSetting: (key: string, defaultValue?: string) => string;
  updateSettings: (entries: Record<string, string>) => Promise<void>;
  isUpdating: boolean;
};

export function EmailSettingsTab({ getSetting, updateSettings, isUpdating }: Props) {
  const [host, setHost] = React.useState("");
  const [port, setPort] = React.useState("");
  const [user, setUser] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [fromName, setFromName] = React.useState("");
  const [fromEmail, setFromEmail] = React.useState("");
  const [enabled, setEnabled] = React.useState(true);
  const [testing, setTesting] = React.useState(false);

  React.useEffect(() => {
    setHost(getSetting(SETTING_KEYS.SMTP_HOST, ""));
    setPort(getSetting(SETTING_KEYS.SMTP_PORT, "587"));
    setUser(getSetting(SETTING_KEYS.SMTP_USER, ""));
    setPassword(getSetting(SETTING_KEYS.SMTP_PASSWORD, ""));
    setFromName(getSetting(SETTING_KEYS.SMTP_FROM_NAME, ""));
    setFromEmail(getSetting(SETTING_KEYS.SMTP_FROM_EMAIL, ""));
    const en = getSetting(SETTING_KEYS.EMAIL_SENDING_ENABLED, "true");
    setEnabled(en !== "false" && en !== "0");
  }, [getSetting]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateSettings({
        [SETTING_KEYS.SMTP_HOST]: host,
        [SETTING_KEYS.SMTP_PORT]: port,
        [SETTING_KEYS.SMTP_USER]: user,
        [SETTING_KEYS.SMTP_PASSWORD]: password,
        [SETTING_KEYS.SMTP_FROM_NAME]: fromName,
        [SETTING_KEYS.SMTP_FROM_EMAIL]: fromEmail,
        [SETTING_KEYS.EMAIL_SENDING_ENABLED]: enabled ? "true" : "false",
      });
      toast.success("Email settings saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const res = await fetch("/api/settings/test-email", { method: "POST" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.message ?? "Test failed");
      }
      toast.success("Test email sent. Check your inbox.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Test failed");
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email Settings</CardTitle>
        <p className="text-sm text-muted-foreground">
          SMTP configuration. Server may also use SMTP_* environment variables.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-6">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <Label>Enable email sending</Label>
              <p className="text-sm text-muted-foreground">When off, no emails are sent.</p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>SMTP Host</Label>
              <Input
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder="smtp.example.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Port</Label>
              <Input
                type="number"
                value={port}
                onChange={(e) => setPort(e.target.value)}
                placeholder="587"
              />
            </div>
            <div className="space-y-2">
              <Label>Username</Label>
              <Input
                value={user}
                onChange={(e) => setUser(e.target.value)}
                placeholder="user"
              />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground">Leave blank to keep current.</p>
            </div>
            <div className="space-y-2">
              <Label>From Name</Label>
              <Input
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
                placeholder="IE Manager"
              />
            </div>
            <div className="space-y-2">
              <Label>From Email</Label>
              <Input
                type="email"
                value={fromEmail}
                onChange={(e) => setFromEmail(e.target.value)}
                placeholder="noreply@example.com"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={isUpdating}>
              {isUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save changes
            </Button>
            <Button type="button" variant="outline" onClick={handleTest} disabled={testing}>
              {testing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Test connection
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
