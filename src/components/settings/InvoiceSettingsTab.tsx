"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { SETTING_KEYS } from "@/lib/settings";
import toast from "react-hot-toast";
import { Loader2 } from "lucide-react";

type Props = {
  settings: Record<string, string>;
  getSetting: (key: string, defaultValue?: string) => string;
  updateSettings: (entries: Record<string, string>) => Promise<void>;
  isUpdating: boolean;
};

const REMINDER_DAYS_DEFAULT = "3,0,7";

export function InvoiceSettingsTab({ getSetting, updateSettings, isUpdating }: Props) {
  const [invoicePrefix, setInvoicePrefix] = React.useState("");
  const [prefixImport, setPrefixImport] = React.useState("");
  const [prefixExport, setPrefixExport] = React.useState("");
  const [paymentTerms, setPaymentTerms] = React.useState("");
  const [currency, setCurrency] = React.useState("");
  const [taxRate, setTaxRate] = React.useState("");
  const [reminderDays, setReminderDays] = React.useState("");
  const [terms, setTerms] = React.useState("");
  const [pdfFooter, setPdfFooter] = React.useState("");

  React.useEffect(() => {
    setInvoicePrefix(getSetting(SETTING_KEYS.INVOICE_PREFIX, "INV"));
    setPrefixImport(getSetting(SETTING_KEYS.SHIPMENT_PREFIX_IMPORT, "IMP"));
    setPrefixExport(getSetting(SETTING_KEYS.SHIPMENT_PREFIX_EXPORT, "EXP"));
    setPaymentTerms(getSetting(SETTING_KEYS.DEFAULT_PAYMENT_TERMS, "Net 30"));
    setCurrency(getSetting(SETTING_KEYS.DEFAULT_CURRENCY, "PKR"));
    setTaxRate(getSetting(SETTING_KEYS.DEFAULT_TAX_RATE, "0"));
    setReminderDays(getSetting(SETTING_KEYS.INVOICE_REMINDER_DAYS, REMINDER_DAYS_DEFAULT));
    setTerms(getSetting(SETTING_KEYS.INVOICE_TERMS, ""));
    setPdfFooter(getSetting(SETTING_KEYS.INVOICE_PDF_FOOTER, ""));
  }, [getSetting]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateSettings({
        [SETTING_KEYS.INVOICE_PREFIX]: invoicePrefix,
        [SETTING_KEYS.SHIPMENT_PREFIX_IMPORT]: prefixImport,
        [SETTING_KEYS.SHIPMENT_PREFIX_EXPORT]: prefixExport,
        [SETTING_KEYS.DEFAULT_PAYMENT_TERMS]: paymentTerms,
        [SETTING_KEYS.DEFAULT_CURRENCY]: currency,
        [SETTING_KEYS.DEFAULT_TAX_RATE]: taxRate,
        [SETTING_KEYS.INVOICE_REMINDER_DAYS]: reminderDays,
        [SETTING_KEYS.INVOICE_TERMS]: terms,
        [SETTING_KEYS.INVOICE_PDF_FOOTER]: pdfFooter,
      });
      toast.success("Invoice settings saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invoice Settings</CardTitle>
        <p className="text-sm text-muted-foreground">Prefixes, defaults, and reminder days.</p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Invoice number prefix</Label>
              <Input value={invoicePrefix} onChange={(e) => setInvoicePrefix(e.target.value)} placeholder="INV" />
            </div>
            <div className="space-y-2">
              <Label>Shipment ref prefix (Import)</Label>
              <Input value={prefixImport} onChange={(e) => setPrefixImport(e.target.value)} placeholder="IMP" />
            </div>
            <div className="space-y-2">
              <Label>Shipment ref prefix (Export)</Label>
              <Input value={prefixExport} onChange={(e) => setPrefixExport(e.target.value)} placeholder="EXP" />
            </div>
            <div className="space-y-2">
              <Label>Default payment terms</Label>
              <Input value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} placeholder="Net 30" />
            </div>
            <div className="space-y-2">
              <Label>Default currency</Label>
              <Input value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="PKR" />
            </div>
            <div className="space-y-2">
              <Label>Default tax rate %</Label>
              <Input type="number" min={0} step={0.01} value={taxRate} onChange={(e) => setTaxRate(e.target.value)} placeholder="0" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Invoice due reminder days</Label>
              <Input
                value={reminderDays}
                onChange={(e) => setReminderDays(e.target.value)}
                placeholder="e.g. 3,0,7 (before due, on due, after due)"
              />
              <p className="text-xs text-muted-foreground">Comma-separated days.</p>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Terms and conditions / footer text</Label>
              <textarea
                className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                placeholder="Payment terms..."
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Invoice PDF footer text</Label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                value={pdfFooter}
                onChange={(e) => setPdfFooter(e.target.value)}
                placeholder="Footer on PDF..."
              />
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
