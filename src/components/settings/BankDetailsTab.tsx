"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Switch } from "@/components/ui/Switch";
import { SETTING_KEYS } from "@/lib/settings";
import toast from "react-hot-toast";
import { Loader2, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  settings: Record<string, string>;
  getSetting: (key: string, defaultValue?: string) => string;
  updateSettings: (entries: Record<string, string>) => Promise<void>;
  isUpdating: boolean;
  /** True for roles that may view but not change the bank details (only a Super Admin can save). */
  readOnly?: boolean;
};

export function BankDetailsTab({ getSetting, updateSettings, isUpdating, readOnly = false }: Props) {
  const [holder, setHolder] = React.useState("");
  const [currency, setCurrency] = React.useState("");
  const [accountNumber, setAccountNumber] = React.useState("");
  const [iban, setIban] = React.useState("");
  const [bankName, setBankName] = React.useState("");
  const [branch, setBranch] = React.useState("");
  const [swift, setSwift] = React.useState("");
  const [enabled, setEnabled] = React.useState(true);

  React.useEffect(() => {
    setHolder(getSetting(SETTING_KEYS.BANK_ACCOUNT_HOLDER, ""));
    setCurrency(getSetting(SETTING_KEYS.BANK_ACCOUNT_CURRENCY, ""));
    setAccountNumber(getSetting(SETTING_KEYS.BANK_ACCOUNT_NUMBER, ""));
    setIban(getSetting(SETTING_KEYS.BANK_IBAN, ""));
    setBankName(getSetting(SETTING_KEYS.BANK_NAME, ""));
    setBranch(getSetting(SETTING_KEYS.BANK_BRANCH, ""));
    setSwift(getSetting(SETTING_KEYS.BANK_SWIFT, ""));
    // Shown unless it has been switched off.
    setEnabled(getSetting(SETTING_KEYS.BANK_DETAILS_ENABLED, "true").toLowerCase() !== "false");
  }, [getSetting]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) return;
    try {
      await updateSettings({
        [SETTING_KEYS.BANK_ACCOUNT_HOLDER]: holder.trim(),
        [SETTING_KEYS.BANK_ACCOUNT_CURRENCY]: currency.trim().toUpperCase(),
        [SETTING_KEYS.BANK_ACCOUNT_NUMBER]: accountNumber.trim(),
        // IBAN and SWIFT are case-insensitive standards; store them in capitals without stray spaces.
        [SETTING_KEYS.BANK_IBAN]: iban.replace(/\s+/g, "").toUpperCase(),
        [SETTING_KEYS.BANK_NAME]: bankName.trim(),
        [SETTING_KEYS.BANK_BRANCH]: branch.trim(),
        [SETTING_KEYS.BANK_SWIFT]: swift.replace(/\s+/g, "").toUpperCase(),
        [SETTING_KEYS.BANK_DETAILS_ENABLED]: enabled ? "true" : "false",
      });
      toast.success("Bank details saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    }
  };

  const prefix = currency.trim() ? `${currency.trim().toUpperCase()} ` : "";
  const previewLines: string[] = [
    holder.trim(),
    accountNumber.trim() && `${prefix}A/C NO: ${accountNumber.trim()}`,
    iban.trim() && `${prefix}IBAN NO: ${iban.replace(/\s+/g, "").toUpperCase()}`,
    bankName.trim() && `BANK NAME: ${bankName.trim()}`,
    branch.trim() && `BRANCH ADDRESS: ${branch.trim()}`,
    swift.trim() && `SWIFT CODE: ${swift.replace(/\s+/g, "").toUpperCase()}`,
  ].filter(Boolean) as string[];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr,360px]">
      <Card>
        <CardHeader>
          <CardTitle>Bank Details</CardTitle>
          <p className="text-sm text-muted-foreground">
            Your bank details. They are printed in the bank details box at the bottom of every invoice PDF, for all companies.
          </p>
        </CardHeader>
        <CardContent>
          {readOnly && (
            <div className="mb-6 flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              <Lock className="h-4 w-4 shrink-0" />
              Only the Super Admin can change bank details.
            </div>
          )}
          <form onSubmit={handleSave} className="space-y-6">
            <fieldset disabled={readOnly} className="space-y-6 min-w-0 border-0 p-0 m-0">
            <div className="flex items-center justify-between gap-4 rounded-lg border bg-muted/30 px-4 py-3">
              <div className="space-y-0.5">
                <Label htmlFor="bank-enabled" className="text-sm font-semibold">
                  Show bank details on invoices
                </Label>
                <p className="text-xs text-muted-foreground">
                  {enabled
                    ? "The bank details box is printed on every invoice PDF."
                    : "The bank details box is hidden on invoice PDFs. Your saved details are kept."}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span
                  className={cn(
                    "w-7 text-right text-xs font-semibold",
                    enabled ? "text-primary" : "text-muted-foreground"
                  )}
                  aria-hidden="true"
                >
                  {enabled ? "ON" : "OFF"}
                </span>
                <Switch id="bank-enabled" checked={enabled} onCheckedChange={setEnabled} aria-label="Show bank details on invoices" />
              </div>
            </div>
            <div className={cn("grid gap-4 sm:grid-cols-2 transition-opacity", !enabled && "opacity-60")}>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="bank-holder">Account holder name</Label>
                <Input id="bank-holder" value={holder} onChange={(e) => setHolder(e.target.value)} placeholder="e.g. YOUR COMPANY NAME" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bank-currency">Account currency</Label>
                <Input id="bank-currency" value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="e.g. USD" maxLength={5} />
                <p className="text-xs text-muted-foreground">Shown before A/C NO and IBAN NO. Leave empty to omit.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bank-number">Account number</Label>
                <Input id="bank-number" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="bank-iban">IBAN</Label>
                <Input id="bank-iban" value={iban} onChange={(e) => setIban(e.target.value)} placeholder="e.g. AE00 0000 0000 0000 0000 000" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bank-name">Bank name</Label>
                <Input id="bank-name" value={bankName} onChange={(e) => setBankName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bank-branch">Branch address</Label>
                <Input id="bank-branch" value={branch} onChange={(e) => setBranch(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bank-swift">SWIFT code</Label>
                <Input id="bank-swift" value={swift} onChange={(e) => setSwift(e.target.value)} maxLength={11} />
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
          <CardTitle className="text-base">Preview on invoice PDF</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={cn("rounded-md border p-3 text-sm", enabled ? "border-[#3F730A]" : "border-dashed border-muted-foreground/40")}>
            {!enabled ? (
              <p className="text-muted-foreground">Bank details are hidden. Nothing is printed on invoices.</p>
            ) : previewLines.length > 0 ? (
              <div className="space-y-1">
                <p className="text-xs font-bold uppercase tracking-wide text-[#3F730A]">BANK DETAILS</p>
                {previewLines.map((line, i) => (
                  <p key={i} className={i === 0 && holder.trim() ? "font-semibold" : "text-muted-foreground"}>
                    {line}
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">Bank details will be provided separately.</p>
            )}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Empty fields are left out. Only a Super Admin can save changes.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
