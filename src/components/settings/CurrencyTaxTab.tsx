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

export function CurrencyTaxTab({ getSetting, updateSettings, isUpdating }: Props) {
  const [baseCurrency, setBaseCurrency] = React.useState("");
  const [currenciesEnabled, setCurrenciesEnabled] = React.useState("");
  const [taxRatesJson, setTaxRatesJson] = React.useState("");

  React.useEffect(() => {
    setBaseCurrency(getSetting(SETTING_KEYS.BASE_CURRENCY, "PKR"));
    setCurrenciesEnabled(getSetting(SETTING_KEYS.CURRENCIES_ENABLED, "PKR,USD,EUR"));
    setTaxRatesJson(getSetting(SETTING_KEYS.TAX_RATES, ""));
  }, [getSetting]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateSettings({
        [SETTING_KEYS.BASE_CURRENCY]: baseCurrency,
        [SETTING_KEYS.CURRENCIES_ENABLED]: currenciesEnabled,
        [SETTING_KEYS.TAX_RATES]: taxRatesJson,
      });
      toast.success("Currency and tax settings saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Currency and Tax</CardTitle>
        <p className="text-sm text-muted-foreground">
          Base currency, enabled currencies, tax rate types (e.g. GST 17%, WHT 10%).
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Base currency</Label>
              <Input value={baseCurrency} onChange={(e) => setBaseCurrency(e.target.value)} placeholder="PKR" />
            </div>
            <div className="space-y-2">
              <Label>Enabled currencies</Label>
              <Input
                value={currenciesEnabled}
                onChange={(e) => setCurrenciesEnabled(e.target.value)}
                placeholder="PKR,USD,EUR"
              />
              <p className="text-xs text-muted-foreground">Comma-separated codes.</p>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Tax rates (JSON)</Label>
              <textarea
                className="flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm font-mono"
                value={taxRatesJson}
                onChange={(e) => setTaxRatesJson(e.target.value)}
                placeholder='[{"name":"GST","rate":17}]'
              />
              <p className="text-xs text-muted-foreground">List of name and rate objects. Rate in percent.</p>
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
