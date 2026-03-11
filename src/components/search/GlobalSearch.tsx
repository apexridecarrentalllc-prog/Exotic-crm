"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Package, Building2, FileText, ArrowRight, Clock } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

function useDebouncedCallback<Args extends unknown[]>(
  fn: (...args: Args) => void | Promise<void>,
  ms: number
): (...args: Args) => void {
  const ref = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const fnRef = React.useRef(fn);
  fnRef.current = fn;

  return React.useCallback(
    (...args: Args) => {
      if (ref.current) clearTimeout(ref.current);
      ref.current = setTimeout(() => {
        void fnRef.current(...args);
      }, ms);
    },
    [ms]
  );
}

const RECENT_KEY = "ie-manager-recent-search";
const MAX_RECENT = 8;

type SearchResult = {
  shipments: Array<{ id: string; referenceNumber: string; type: string; status: string; origin: string; destination: string }>;
  companies: Array<{ id: string; name: string; type: string[]; isActive: boolean }>;
  invoices: Array<{ id: string; invoiceNumber: string; status: string; totalAmount: number; companyName: string }>;
  total: number;
};

function getRecent(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

function addRecent(query: string) {
  if (!query.trim()) return;
  const recent = getRecent().filter((r) => r.toLowerCase() !== query.trim().toLowerCase());
  recent.unshift(query.trim());
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
  } catch {}
}

export function GlobalSearch({
  open,
  onClose,
  triggerRef: _triggerRef,
}: {
  open: boolean;
  onClose: () => void;
  triggerRef?: React.RefObject<HTMLButtonElement | null>;
}) {
  void _triggerRef;
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<SearchResult | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [focusedIndex, setFocusedIndex] = React.useState(-1);
  const [recent, setRecent] = React.useState<string[]>([]);

  const runSearch = useDebouncedCallback(async (q: string) => {
    if (!q || q.length < 2) {
      setResults(null);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=5`);
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      setResults(data);
    } catch {
      setResults({ shipments: [], companies: [], invoices: [], total: 0 });
    } finally {
      setLoading(false);
    }
  }, 300);

  React.useEffect(() => {
    setRecent(getRecent());
  }, []);

  React.useEffect(() => {
    setQuery("");
    setResults(null);
    setFocusedIndex(-1);
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  React.useEffect(() => {
    runSearch(query);
  }, [query, runSearch]);

  const items: { type: "shipment" | "company" | "invoice"; href: string; label: string; sub?: string }[] = [];
  if (results) {
    results.shipments.forEach((s) =>
      items.push({
        type: "shipment",
        href: `/shipments/${s.id}`,
        label: s.referenceNumber,
        sub: `${s.origin} → ${s.destination}`,
      })
    );
    results.companies.forEach((c) =>
      items.push({ type: "company", href: `/companies/${c.id}`, label: c.name, sub: c.type?.join(", ") })
    );
    results.invoices.forEach((i) =>
      items.push({
        type: "invoice",
        href: `/invoices/${i.id}`,
        label: i.invoiceNumber,
        sub: `${i.companyName} · ${i.totalAmount}`,
      })
    );
  }

  const totalItems = items.length;
  const showRecent = !query.trim() && recent.length > 0 && !results;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIndex((i) => (i < totalItems - 1 ? i + 1 : i));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIndex((i) => (i > 0 ? i - 1 : -1));
      return;
    }
    if (e.key === "Enter" && focusedIndex >= 0 && items[focusedIndex]) {
      e.preventDefault();
      addRecent(query);
      router.push(items[focusedIndex].href);
      onClose();
    }
  };

  const handleSelect = (href: string) => {
    addRecent(query);
    router.push(href);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center pt-[12vh]" onClick={onClose}>
      <div
        className="bg-card border rounded-lg shadow-xl w-full max-w-xl mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center border-b px-3">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            ref={inputRef}
            type="text"
            placeholder="Search shipments, companies, invoices..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="border-0 focus-visible:ring-0 rounded-none h-12 flex-1"
            autoComplete="off"
          />
          <kbd className="hidden sm:inline text-xs text-muted-foreground border rounded px-1.5 py-0.5">ESC</kbd>
        </div>
        <div ref={listRef} className="max-h-[60vh] overflow-y-auto">
          {loading && (
            <div className="p-4 text-sm text-muted-foreground">Searching...</div>
          )}
          {!loading && showRecent && (
            <div className="p-2">
              <p className="text-xs font-medium text-muted-foreground px-2 py-1 flex items-center gap-2">
                <Clock className="h-3 w-3" /> Recent
              </p>
              {recent.map((r) => (
                <button
                  key={r}
                  type="button"
                  className="w-full text-left px-3 py-2 rounded hover:bg-muted flex items-center gap-2 text-sm"
                  onClick={() => { setQuery(r); addRecent(r); runSearch(r); }}
                >
                  <Search className="h-4 w-4 text-muted-foreground" />
                  {r}
                </button>
              ))}
            </div>
          )}
          {!loading && query.length >= 2 && results && results.total === 0 && (
            <div className="p-6 text-center text-muted-foreground text-sm">No results for &quot;{query}&quot;</div>
          )}
          {!loading && results && results.total > 0 && (
            <div className="p-2">
              {results.shipments.length > 0 && (
                <Section title="Shipments" icon={Package}>
                  {results.shipments.map((s) => (
                    <ResultRow
                      key={s.id}
                      href={`/shipments/${s.id}`}
                      label={s.referenceNumber}
                      sub={`${s.origin} → ${s.destination}`}
                      focused={focusedIndex === items.findIndex((it) => it.href === `/shipments/${s.id}`)}
                      onSelect={() => handleSelect(`/shipments/${s.id}`)}
                    />
                  ))}
                </Section>
              )}
              {results.companies.length > 0 && (
                <Section title="Companies" icon={Building2}>
                  {results.companies.map((c) => (
                    <ResultRow
                      key={c.id}
                      href={`/companies/${c.id}`}
                      label={c.name}
                      sub={c.type?.join(", ")}
                      focused={focusedIndex === items.findIndex((it) => it.href === `/companies/${c.id}`)}
                      onSelect={() => handleSelect(`/companies/${c.id}`)}
                    />
                  ))}
                </Section>
              )}
              {results.invoices.length > 0 && (
                <Section title="Invoices" icon={FileText}>
                  {results.invoices.map((i) => (
                    <ResultRow
                      key={i.id}
                      href={`/invoices/${i.id}`}
                      label={i.invoiceNumber}
                      sub={`${i.companyName} · ${i.totalAmount}`}
                      focused={focusedIndex === items.findIndex((it) => it.href === `/invoices/${i.id}`)}
                      onSelect={() => handleSelect(`/invoices/${i.id}`)}
                    />
                  ))}
                </Section>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="mb-2">
      <p className="text-xs font-medium text-muted-foreground px-2 py-1 flex items-center gap-2">
        <Icon className="h-3 w-3" /> {title}
      </p>
      {children}
    </div>
  );
}

function ResultRow({
  href,
  label,
  sub,
  focused,
  onSelect,
}: { href: string; label: string; sub?: string; focused: boolean; onSelect: () => void }) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded text-sm hover:bg-muted",
        focused && "bg-muted"
      )}
      onClick={(e) => { e.preventDefault(); onSelect(); }}
    >
      <span className="font-medium truncate">{label}</span>
      {sub && <span className="text-muted-foreground truncate flex-1 min-w-0">{sub}</span>}
      <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
    </Link>
  );
}
