"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { StageBuilder, type StageItem } from "@/components/shipments/StageBuilder";
import { createShipmentSchema, type CreateShipmentInput } from "@/lib/validations";
import { CURRENCIES } from "@/lib/constants";
import { AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";

async function fetchCompanies(): Promise<{ data: { id: string; name: string }[] }> {
  const res = await fetch("/api/companies?limit=100");
  if (!res.ok) throw new Error("Failed to fetch companies");
  return res.json();
}

export default function NewShipmentPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [stages, setStages] = React.useState<StageItem[]>([]);

  const { data: companiesData } = useQuery({
    queryKey: ["companies"],
    queryFn: fetchCompanies,
  });
  const companyOptions = companiesData?.data ?? [];

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateShipmentInput>({
    resolver: zodResolver(createShipmentSchema) as Resolver<CreateShipmentInput>,
    defaultValues: {
      type: "IMPORT",
      orderDate: new Date(),
      currency: "PKR",
      isUrgent: false,
    },
  });

  const orderDateStr = watch("orderDate")
    ? new Date(watch("orderDate") as Date).toISOString().slice(0, 10)
    : "";

  const type = watch("type");

  const onSubmit = async (data: CreateShipmentInput) => {
    const payload = {
      ...data,
      orderDate: data.orderDate instanceof Date ? data.orderDate : data.orderDate ? new Date(data.orderDate as unknown as string) : new Date(),
      stages: stages.filter((s) => s.stageName.trim() && s.companyId).map((s, i) => ({
        stageName: s.stageName,
        companyId: s.companyId,
        stageOrder: i,
        notes: s.notes,
      })),
    };
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/shipments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to create shipment");
      }
      const shipment = await res.json();
      toast.success("Shipment created successfully");
      router.push(`/shipments/${shipment.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create shipment");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="New Shipment"
        breadcrumbs={[
          { label: "Shipments", href: "/shipments" },
          { label: "New", href: "/shipments/new" },
        ]}
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Section 1: Order Details */}
        <Card>
          <CardHeader>
            <CardTitle>Order Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Type</Label>
              <div className="mt-2 flex gap-4">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    value="IMPORT"
                    checked={type === "IMPORT"}
                    onChange={() => setValue("type", "IMPORT", { shouldDirty: true })}
                    className="h-4 w-4"
                  />
                  <span className="font-medium">Import</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    value="EXPORT"
                    checked={type === "EXPORT"}
                    onChange={() => setValue("type", "EXPORT", { shouldDirty: true })}
                    className="h-4 w-4"
                  />
                  <span className="font-medium">Export</span>
                </label>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="orderDate">Order Date</Label>
                <Input
                  id="orderDate"
                  type="date"
                  value={orderDateStr}
                  onChange={(e) => setValue("orderDate", e.target.value ? new Date(e.target.value) : undefined, { shouldDirty: true })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expectedDelivery">Expected Delivery</Label>
                <Input
                  id="expectedDelivery"
                  type="date"
                  {...register("expectedDelivery", { valueAsDate: true })}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="origin">Origin *</Label>
                <Input id="origin" {...register("origin")} placeholder="Port or city" />
                {errors.origin && (
                  <p className="text-xs text-destructive">{errors.origin.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="destination">Destination *</Label>
                <Input id="destination" {...register("destination")} placeholder="Port or city" />
                {errors.destination && (
                  <p className="text-xs text-destructive">{errors.destination.message}</p>
                )}
              </div>
            </div>
            <label className="flex items-center gap-2">
              <input type="checkbox" {...register("isUrgent")} className="rounded border-input" />
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span>Mark as Urgent</span>
            </label>
          </CardContent>
        </Card>

        {/* Section 2: Cargo Information */}
        <Card>
          <CardHeader>
            <CardTitle>Cargo Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="goodsDescription">Goods Description *</Label>
              <textarea
                id="goodsDescription"
                {...register("goodsDescription")}
                rows={3}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Describe the cargo..."
              />
              {errors.goodsDescription && (
                <p className="text-xs text-destructive">{errors.goodsDescription.message}</p>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="containerNumber">Container Number</Label>
                <Input id="containerNumber" {...register("containerNumber")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="awbNumber">AWB Number</Label>
                <Input id="awbNumber" {...register("awbNumber")} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="cargoValue">Cargo Value</Label>
                <Input
                  id="cargoValue"
                  type="number"
                  step="0.01"
                  {...register("cargoValue", { valueAsNumber: true })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <select
                  id="currency"
                  {...register("currency")}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="weight">Weight (KG)</Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.01"
                  {...register("weight", { valueAsNumber: true })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="volume">Volume (CBM)</Label>
              <Input
                id="volume"
                type="number"
                step="0.01"
                {...register("volume", { valueAsNumber: true })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Shipment Stages */}
        <Card>
          <CardHeader>
            <CardTitle>Shipment Stages</CardTitle>
          </CardHeader>
          <CardContent>
            <StageBuilder
              type={type}
              stages={stages}
              onChange={setStages}
              companyOptions={companyOptions}
            />
          </CardContent>
        </Card>

        {/* Section 4: Internal Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Internal Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <textarea
              id="internalNotes"
              {...register("internalNotes")}
              rows={3}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Private notes..."
            />
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end">
          <Button type="button" variant="outline" onClick={() => router.push("/shipments")}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create Shipment"}
          </Button>
        </div>
      </form>
    </div>
  );
}
