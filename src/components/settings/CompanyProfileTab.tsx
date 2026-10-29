"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { SETTING_KEYS } from "@/lib/settings";
import { BRANDING_QUERY_KEY } from "@/hooks/useBranding";
import toast from "react-hot-toast";
import { Loader2, Lock, Mail, MapPin, Phone, Upload, X } from "lucide-react";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

type Props = {
  settings: Record<string, string>;
  getSetting: (key: string, defaultValue?: string) => string;
  updateSettings: (entries: Record<string, string>) => Promise<void>;
  isUpdating: boolean;
  /** True for roles that may view but not change business details (only the Super Admin can save). */
  readOnly?: boolean;
};

export function CompanyProfileTab({ getSetting, updateSettings, isUpdating, readOnly = false }: Props) {
  const queryClient = useQueryClient();
  const [name, setName] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [city, setCity] = React.useState("");
  const [country, setCountry] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [website, setWebsite] = React.useState("");
  const [strn, setStrn] = React.useState("");
  const [logoUrl, setLogoUrl] = React.useState("");
  const [logoUploading, setLogoUploading] = React.useState(false);
  const [logoRemoving, setLogoRemoving] = React.useState(false);
  const [confirmRemoveOpen, setConfirmRemoveOpen] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setName(getSetting(SETTING_KEYS.COMPANY_NAME, ""));
    setAddress(getSetting(SETTING_KEYS.COMPANY_ADDRESS, ""));
    setCity(getSetting(SETTING_KEYS.COMPANY_CITY, ""));
    setCountry(getSetting(SETTING_KEYS.COMPANY_COUNTRY, ""));
    setPhone(getSetting(SETTING_KEYS.COMPANY_PHONE, ""));
    setEmail(getSetting(SETTING_KEYS.COMPANY_EMAIL, ""));
    setWebsite(getSetting(SETTING_KEYS.COMPANY_WEBSITE, ""));
    setStrn(getSetting(SETTING_KEYS.COMPANY_STRN, ""));
    setLogoUrl(getSetting(SETTING_KEYS.COMPANY_LOGO, ""));
  }, [getSetting]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateSettings({
        [SETTING_KEYS.COMPANY_NAME]: name.trim(),
        [SETTING_KEYS.COMPANY_ADDRESS]: address.trim(),
        [SETTING_KEYS.COMPANY_CITY]: city.trim(),
        [SETTING_KEYS.COMPANY_COUNTRY]: country.trim(),
        [SETTING_KEYS.COMPANY_PHONE]: phone.trim(),
        [SETTING_KEYS.COMPANY_EMAIL]: email.trim(),
        [SETTING_KEYS.COMPANY_WEBSITE]: website.trim(),
        [SETTING_KEYS.COMPANY_STRN]: strn.trim(),
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

  // Same rules as the invoice PDF footer: only the Address box is used (no city or country),
  // and line breaks in it become commas.
  const addressLine = address
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/[,\s]+$/, ""))
    .filter(Boolean)
    .join(", ");
  const emailLine = email.trim();
  const phoneLine = phone.trim();
  const contactPreview = [
    emailLine && { key: "email", caption: "Email", Icon: Mail, text: emailLine },
    addressLine && { key: "address", caption: "Address", Icon: MapPin, text: addressLine },
    phoneLine && { key: "phone", caption: "Phone", Icon: Phone, text: phoneLine },
  ].filter(Boolean) as { key: string; caption: string; Icon: typeof Mail; text: string }[];

  const handleLogoRemove = async () => {
    setLogoRemoving(true);
    try {
      const res = await fetch("/api/settings/logo", { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.message ?? "Could not remove the logo");
      }
      setLogoUrl("");
      queryClient.invalidateQueries({ queryKey: BRANDING_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast.success("Logo removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove the logo");
    } finally {
      setLogoRemoving(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr,360px]">
      <ConfirmDialog
        open={confirmRemoveOpen}
        onOpenChange={setConfirmRemoveOpen}
        title="Remove logo?"
        description="The logo will be removed from the sidebar. Invoice PDFs will use the default logo instead. You can upload a new one at any time."
        confirmLabel="Remove"
        onConfirm={handleLogoRemove}
      />
      <Card>
        <CardHeader>
          <CardTitle>Company Profile</CardTitle>
          <p className="text-sm text-muted-foreground">
            Your business details. The logo appears in the sidebar and on invoice PDFs.
          </p>
        </CardHeader>
        <CardContent>
          {readOnly && (
            <div className="mb-6 flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              <Lock className="h-4 w-4 shrink-0" />
              Only the Super Admin can change business details.
            </div>
          )}
          <form onSubmit={handleSave} className="space-y-8">
            <div className="space-y-2">
              <Label>Company Logo</Label>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-24 h-24 rounded border bg-muted flex items-center justify-center overflow-hidden">
                    {logoUrl ? (
                      <Image src={logoUrl} alt="Logo" width={96} height={96} className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-xs text-muted-foreground">No logo</span>
                    )}
                  </div>
                  {logoUrl && (
                    <button
                      type="button"
                      onClick={() => setConfirmRemoveOpen(true)}
                      disabled={logoUploading || logoRemoving}
                      aria-label="Remove logo"
                      title="Remove logo"
                      className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border border-background bg-destructive text-destructive-foreground shadow transition-colors hover:bg-destructive/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {logoRemoving ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                    </button>
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

            <fieldset disabled={readOnly} className="space-y-8">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold">Printed on every invoice</h3>
                  <p className="text-xs text-muted-foreground">
                    The email, address and phone appear in the footer of every invoice PDF, each with an icon. The company name is shown on the date line of the footer.
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="company_name">Company Name</Label>
                    <Input id="company_name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your company name" />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="company_email">Email</Label>
                    <Input id="company_email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="info@company.com" />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="company_address">Address</Label>
                    <textarea
                      id="company_address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      rows={3}
                      placeholder="Office, building, street"
                      className="flex w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                    <p className="text-xs text-muted-foreground">Only this box is printed. City and country are not.</p>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="company_phone">Phone</Label>
                    <Input id="company_phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+971 50 123 4567" />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold">Other details</h3>
                  <p className="text-xs text-muted-foreground">Saved for reference. These are not printed on invoices.</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="company_city">City</Label>
                    <Input id="company_city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ajman" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company_country">Country</Label>
                    <Input id="company_country" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="UAE" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company_website">Website</Label>
                    <Input id="company_website" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://example.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company_strn">Trade license / tax ID</Label>
                    <Input id="company_strn" value={strn} onChange={(e) => setStrn(e.target.value)} placeholder="Optional" />
                  </div>
                </div>
              </div>
            </fieldset>

            {!readOnly && (
              <Button type="submit" disabled={isUpdating}>
                {isUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save changes
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="text-base">Invoice footer preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border bg-white p-3 text-[#4B6B38]">
            {contactPreview.length > 0 ? (
              <ul className="space-y-3 rounded border border-[#C5D9B4] bg-[#F4F8F0] p-3">
                {contactPreview.map(({ key, caption, Icon, text }) => (
                  <li key={key} className="flex items-center gap-2.5">
                    <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-[#3F730A]">
                      <Icon className="h-2.5 w-2.5 text-white" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[9px] uppercase tracking-wider">{caption}</span>
                      <span className="block break-words text-xs text-[#3F730A]">{text}</span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded border border-dashed border-[#C5D9B4] p-3 text-xs text-muted-foreground">
                Nothing saved. No contact band is printed in the footer.
              </p>
            )}
            <p className="mt-2 text-right text-[11px]">
              {new Date().toLocaleDateString("en-GB")} · {name.trim() || "Company name"}
            </p>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            On the PDF the details sit side by side in a band at the bottom of every page. Empty ones are left out.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
