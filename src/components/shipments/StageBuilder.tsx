"use client";

import * as React from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { DEFAULT_IMPORT_STAGES, DEFAULT_EXPORT_STAGES } from "@/lib/shipment-constants";

export type StageItem = { stageName: string; companyId: string; stageOrder: number; notes?: string };

export interface CompanyOption {
  id: string;
  name: string;
}

export interface StageBuilderProps {
  type: "IMPORT" | "EXPORT";
  stages: StageItem[];
  onChange: (stages: StageItem[]) => void;
  companyOptions: CompanyOption[];
  onSearchCompanies?: (search: string) => void;
  errors?: { stages?: { message?: string } };
}

export function StageBuilder({
  type,
  stages,
  onChange,
  companyOptions,
  errors,
}: StageBuilderProps) {
  const setDefaultStages = React.useCallback(() => {
    const defaultStages =
      type === "IMPORT" ? DEFAULT_IMPORT_STAGES : DEFAULT_EXPORT_STAGES;
    onChange(
      defaultStages.map((s, i) => ({
        stageName: s.stageName,
        companyId: stages[i]?.companyId ?? "",
        stageOrder: i,
        notes: stages[i]?.notes,
      }))
    );
  }, [type, onChange, stages]);

  React.useEffect(() => {
    if (stages.length === 0) setDefaultStages();
  }, [type]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateStage = (index: number, updates: Partial<StageItem>) => {
    const next = stages.map((s, i) =>
      i === index ? { ...s, ...updates } : { ...s, stageOrder: i }
    );
    onChange(next);
  };

  const addStage = () => {
    onChange([
      ...stages.map((s, i) => ({ ...s, stageOrder: i })),
      { stageName: "", companyId: "", stageOrder: stages.length },
    ]);
  };

  const removeStage = (index: number) => {
    const next = stages.filter((_, i) => i !== index).map((s, i) => ({ ...s, stageOrder: i }));
    onChange(next);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Shipment Stages</Label>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={setDefaultStages}>
            Reset to defaults
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={addStage}>
            <Plus className="h-4 w-4 mr-1" />
            Add Stage
          </Button>
        </div>
      </div>
      {errors?.stages?.message && (
        <p className="text-sm text-destructive">{errors.stages.message}</p>
      )}
      <div className="space-y-3">
        {stages.map((stage, index) => (
          <div
            key={index}
            className="flex items-start gap-2 rounded-lg border bg-card p-3"
          >
            <span className="mt-2.5 text-muted-foreground">
              <GripVertical className="h-4 w-4" />
            </span>
            <div className="grid flex-1 gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs">Stage name</Label>
                <Input
                  value={stage.stageName}
                  onChange={(e) => updateStage(index, { stageName: e.target.value })}
                  placeholder="e.g. Port Clearance"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Assign company</Label>
                <select
                  value={stage.companyId}
                  onChange={(e) => updateStage(index, { companyId: e.target.value })}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Select company</option>
                  {companyOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => removeStage(index)}
              disabled={stages.length <= 1}
              aria-label="Remove stage"
              className="mt-1.5"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
