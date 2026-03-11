"use client";

import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";

export interface ReportFiltersProps {
  startDate: string;
  endDate: string;
  companyId: string;
  onStartDateChange: (v: string) => void;
  onEndDateChange: (v: string) => void;
  onCompanyChange: (v: string) => void;
  companies?: Array<{ id: string; name: string }>;
  showCompany?: boolean;
  yearOnly?: boolean;
}

export function ReportFilters(p: ReportFiltersProps) {
  const {
    startDate,
    endDate,
    companyId,
    onStartDateChange,
    onEndDateChange,
    onCompanyChange,
    companies = [],
    showCompany = true,
    yearOnly = false,
  } = p;
  const currentYear = new Date().getFullYear();
  if (yearOnly) {
    return (
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <Label>Year</Label>
          <select
            value={endDate ? endDate.slice(0, 4) : currentYear}
            onChange={(e) => {
              const y = e.target.value;
              onStartDateChange(y + "-01-01");
              onEndDateChange(y + "-12-31");
            }}
            className="mt-1 h-9 rounded-md border border-input bg-transparent px-3 text-sm w-[120px]"
          >
            {[currentYear, currentYear - 1, currentYear - 2].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        {showCompany && (
          <div>
            <Label>Company</Label>
            <select value={companyId} onChange={(e) => onCompanyChange(e.target.value)} className="mt-1 h-9 rounded-md border border-input bg-transparent px-3 text-sm w-[200px]">
              <option value="">All companies</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-end gap-4">
      <div>
        <Label>Start date</Label>
        <Input type="date" value={startDate} onChange={(e) => onStartDateChange(e.target.value)} className="mt-1 h-9 w-[140px]" />
      </div>
      <div>
        <Label>End date</Label>
        <Input type="date" value={endDate} onChange={(e) => onEndDateChange(e.target.value)} className="mt-1 h-9 w-[140px]" />
      </div>
      {showCompany && (
        <div>
          <Label>Company</Label>
          <select value={companyId} onChange={(e) => onCompanyChange(e.target.value)} className="mt-1 h-9 rounded-md border border-input bg-transparent px-3 text-sm w-[200px]">
            <option value="">All companies</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
