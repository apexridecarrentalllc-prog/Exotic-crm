"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { CURRENCIES } from "@/lib/constants";
import { ShipmentStatusBadge } from "@/components/shipments/ShipmentStatusBadge";
import { getTypeLabel } from "@/lib/shipment-constants";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";

async function fetchShipment(id: string) {
  const res = await fetch(`/api/shipments/${id}`);
  if (!res.ok) throw new Error("Failed to fetch shipment");
  return res.json();
}

export default function EditShipmentPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [form, setForm] = React.useState({
    origin: "",
    destination: "",
    goodsDescription: "",
    containerNumber: "",
    awbNumber: "",
    weight: "" as string | number,
    volume: "" as string | number,
    cargoValue: "" as string | number,
    currency: "PKR",
    isUrgent: false,
    internalNotes: "",
    expectedDelivery: "",
  });

  const { data: shipment, isLoading } = useQuery({
    queryKey: ["shipment", id],
    queryFn: () => fetchShipment(id),
    enabled: !!id,
  });

  React.useEffect(() => {
    if (shipment) {
      setForm({
        origin: shipment.origin ?? "",
        destination: shipment.destination ?? "",
        goodsDescription: shipment.goodsDescription ?? "",
        containerNumber: shipment.containerNumber ?? "",
        awbNumber: shipment.awbNumber ?? "",
        weight: shipment.weight ?? "",
        volume: shipment.volume ?? "",
        cargoValue: shipment.cargoValue ?? "",
        currency: shipment.currency ?? "PKR",
        isUrgent: !!shipment.isUrgent,
        internalNotes: shipment.internalNotes ?? "",
        expectedDelivery: shipment.expectedDelivery
          ? new Date(shipment.expectedDelivery).toISOString().slice(0, 10)
          : "",
      });
    }
  }, [shipment]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setIsSubmitting(true);
    try {
      const payload = {
        origin: form.origin || undefined,
        destination: form.destination || undefined,
        goodsDescription: form.goodsDescription || undefined,
        containerNumber: form.containerNumber || null,
        awbNumber: form.awbNumber || null,
        weight: form.weight === "" ? null : Number(form.weight),
        volume: form.volume === "" ? null : Number(form.volume),
        cargoValue: form.cargoValue === "" ? null : Number(form.cargoValue),
        currency: form.currency,
        isUrgent: form.isUrgent,
        internalNotes: form.internalNotes || null,
        expectedDelivery: form.expectedDelivery ? new Date(form.expectedDelivery).toISOString() : null,
      };
      const res = await fetch(`/api/shipments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to update shipment");
      }
      toast.success("Shipment updated");
      router.push(`/shipments/${id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!id) {
    return (
      <div className="p-6">
        <p className="text-destructive">Invalid shipment ID</p>
      </div>
    );
  }

  if (isLoading || !shipment) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Edit ${shipment.referenceNumber}`}
        breadcrumbs={[
          { label: "Shipments", href: "/shipments" },
          { label: shipment.referenceNumber, href: `/shipments/${id}` },
          { label: "Edit", href: `/shipments/${id}/edit` },
        ]}
        actions={
          <>
            <ShipmentStatusBadge status={shipment.status} />
            <span className="text-sm text-muted-foreground">{getTypeLabel(shipment.type)}</span>
            <Link href={`/shipments/${id}`}>
              <Button variant="outline" size="sm">Cancel</Button>
            </Link>
          </>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Order & route</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="origin">Origin *</Label>
                <Input
                  id="origin"
                  value={form.origin}
                  onChange={(e) => setForm((f) => ({ ...f, origin: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="destination">Destination *</Label>
                <Input
                  id="destination"
                  value={form.destination}
                  onChange={(e) => setForm((f) => ({ ...f, destination: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="expectedDelivery">Expected delivery</Label>
              <Input
                id="expectedDelivery"
                type="date"
                value={form.expectedDelivery}
                onChange={(e) => setForm((f) => ({ ...f, expectedDelivery: e.target.value }))}
              />
            </div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.isUrgent}
                onChange={(e) => setForm((f) => ({ ...f, isUrgent: e.target.checked }))}
                className="rounded border-input"
              />
              <span>Mark as urgent</span>
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cargo information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="goodsDescription">Goods description *</Label>
              <textarea
                id="goodsDescription"
                value={form.goodsDescription}
                onChange={(e) => setForm((f) => ({ ...f, goodsDescription: e.target.value }))}
                rows={3}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="containerNumber">Container number</Label>
                <Input
                  id="containerNumber"
                  value={form.containerNumber}
                  onChange={(e) => setForm((f) => ({ ...f, containerNumber: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="awbNumber">AWB number</Label>
                <Input
                  id="awbNumber"
                  value={form.awbNumber}
                  onChange={(e) => setForm((f) => ({ ...f, awbNumber: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="cargoValue">Cargo value</Label>
                <Input
                  id="cargoValue"
                  type="number"
                  step="0.01"
                  value={form.cargoValue}
                  onChange={(e) => setForm((f) => ({ ...f, cargoValue: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <select
                  id="currency"
                  value={form.currency}
                  onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="weight">Weight (KG)</Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.01"
                  value={form.weight}
                  onChange={(e) => setForm((f) => ({ ...f, weight: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="volume">Volume (CBM)</Label>
              <Input
                id="volume"
                type="number"
                step="0.01"
                value={form.volume}
                onChange={(e) => setForm((f) => ({ ...f, volume: e.target.value }))}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Internal notes</CardTitle>
          </CardHeader>
          <CardContent>
            <textarea
              id="internalNotes"
              value={form.internalNotes}
              onChange={(e) => setForm((f) => ({ ...f, internalNotes: e.target.value }))}
              rows={3}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
            />
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end">
          <Link href={`/shipments/${id}`}>
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
