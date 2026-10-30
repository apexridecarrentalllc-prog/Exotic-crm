"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/Input";

const SELECT_CLASS =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2";

type ShipmentOption = { id: string; referenceNumber: string; goodsDescription?: string | null };

/** Picks one shipment, or none ("Company overhead"). A search box keeps it usable with many shipments. */
export function ShipmentSelect({
  id,
  value,
  selectedLabel,
  onChange,
}: {
  id?: string;
  value: string;
  /** Reference of the currently selected shipment, so it stays visible even if the search hides it. */
  selectedLabel?: string | null;
  onChange: (shipmentId: string, label: string) => void;
}) {
  const [search, setSearch] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isFetching } = useQuery({
    queryKey: ["expense-shipment-options", debounced],
    queryFn: async (): Promise<ShipmentOption[]> => {
      const params = new URLSearchParams({ limit: "30" });
      if (debounced) params.set("search", debounced);
      const res = await fetch(`/api/shipments?${params}`);
      if (!res.ok) throw new Error("Failed to load shipments");
      const j = await res.json();
      return j.data ?? [];
    },
    staleTime: 30_000,
  });

  const options = React.useMemo(() => {
    const list = data ?? [];
    if (value && !list.some((s) => s.id === value)) {
      return [{ id: value, referenceNumber: selectedLabel ?? "Selected shipment" }, ...list];
    }
    return list;
  }, [data, value, selectedLabel]);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search shipment reference, container or goods"
          className="h-9 pl-9"
          aria-label="Search shipments"
        />
      </div>
      <select
        id={id}
        value={value}
        onChange={(e) => {
          const opt = options.find((o) => o.id === e.target.value);
          onChange(e.target.value, opt?.referenceNumber ?? "");
        }}
        className={SELECT_CLASS}
      >
        <option value="">No shipment (company overhead)</option>
        {options.map((s) => (
          <option key={s.id} value={s.id}>
            {s.referenceNumber}
            {s.goodsDescription ? ` - ${s.goodsDescription.slice(0, 40)}` : ""}
          </option>
        ))}
      </select>
      {isFetching && <p className="text-xs text-muted-foreground">Searching...</p>}
    </div>
  );
}
