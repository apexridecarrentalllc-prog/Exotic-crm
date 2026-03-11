"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { SETTING_KEYS } from "@/lib/settings";
import { BRANDING_QUERY_KEY } from "@/hooks/useBranding";
import toast from "react-hot-toast";
import { Loader2, Upload } from "lucide-react";

type Props = {
  settings: Record<string, string>;
  getSetting: (key: string, defaultValue?: string) => string;
  updateSettings: (entries: Record<string, string>) => Promise<void>;
  isUpdating: boolean;
};

export function CompanyProfileTab({ getSetting, updateSettings, isUpdating }: Props) {
  const queryClient = useQueryClient();
  const [name, setName] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [city, setCity] = React.useState("");
  const [country, setCountry] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [website, setWebsite] = React.useState("");
  const [ntn, setNtn] = React.useState("");
  const [strn, setStrn] = React.useState("");
  const [logoUrl, setLogoUrl] = React.useState("");
  const [logoUploading, setLogoUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setName(getSetting(SETTING_KEYS.COMPANY_NAME, ""));
    setAddress(getSetting(SETTING_KEYS.COMPANY_ADDRESS, ""));
    setCity(getSetting(SETTING_KEYS.COMPANY_CITY, ""));
    setCountry(getSetting(SETTING_KEYS.COMPANY_COUNTRY, ""));
    setPhone(getSetting(SETTING_KEYS.COMPANY_PHONE, ""));
    setEmail(getSetting(SETTING_KEYS.COMPANY_EMAIL, ""));
    setWebsite(getSetting(SETTING_KEYS.COMPANY_WEBSITE, ""));
    setNtn(getSetting(SETTING_KEYS.COMPANY_NTN, ""));
    setStrn(getSetting(SETTING_KEYS.COMPANY_STRN, ""));
    setLogoUrl(getSetting(SETTING_KEYS.COMPANY_LOGO, ""));
  }, [getSetting]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateSettings({
        [SETTING_KEYS.COMPANY_NAME]: name,
        [SETTING_KEYS.COMPANY_ADDRESS]: address,
        [SETTING_KEYS.COMPANY_CITY]: city,
        [SETTING_KEYS.COMPANY_COUNTRY]: country,
        [SETTING_KEYS.COMPANY_PHONE]: phone,
        [SETTING_KEYS.COMPANY_EMAIL]: email,
        [SETTING_KEYS.COMPANY_WEBSITE]: website,
        [SETTING_KEYS.COMPANY_NTN]: ntn,
        [SETTING_KEYS.COMPANY_STRN]: strn,
      });
      toast.success("Company profile saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    }
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const res = await fetch("/api/settings/logo", { method: "POST", body: formData });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.message ?? "Upload failed");
      }
      const data = await res.json();
      setLogoUrl(data.url ?? "");
      queryClient.invalidateQueries({ queryKey: BRANDING_QUERY_KEY });
      toast.success("Logo uploaded. It will appear in the sidebar and on invoices.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLogoUploading(false);
      e.target.value = "";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Company Profile</CardTitle>
        <p className="text-sm text-muted-foreground">Logo appears in the sidebar, invoice PDFs, and email templates.</p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-6">
          <div className="flex flex-wrap gap-6">
            <div className="space-y-2">
              <Label>Company Logo</Label>
              <div className="flex items-center gap-4">
                <div className="w-24 h-24 rounded border bg-muted flex items-center justify-center overflow-hidden">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-xs text-muted-foreground">No logo</span>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".png,.jpg,.jpeg,.webp"
                  className="hidden"
                  onChange={handleLogoChange}
                  disabled={logoUploading}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={logoUploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {logoUploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                  Upload logo
                </Button>
              </div>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="company_name">Company Name</Label>
              <Input id="company_name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your company name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company_phone">Phone</Label>
              <Input id="company_phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+92 300 1234567" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="company_address">Address</Label>
              <Input id="company_address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, building" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company_city">City</Label>
              <Input id="company_city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Karachi" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company_country">Country</Label>
              <Input id="company_country" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Pakistan" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company_email">Email</Label>
              <Input id="company_email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="info@company.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company_website">Website</Label>
              <Input id="company_website" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://example.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company_ntn">Tax Number (NTN)</Label>
              <Input id="company_ntn" value={ntn} onChange={(e) => setNtn(e.target.value)} placeholder="1234567-8" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company_strn">GST Number (STRN)</Label>
              <Input id="company_strn" value={strn} onChange={(e) => setStrn(e.target.value)} placeholder="Optional" />
            </div>
          </div>
          <Button type="submit" disabled={isUpdating}>
            {isUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Save changes
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
