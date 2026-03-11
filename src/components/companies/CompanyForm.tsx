"use client";

import * as React from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { companyFormSchema, type CompanyInput } from "@/lib/validations";
import type { Resolver } from "react-hook-form";
import { COMPANY_TYPES, PAYMENT_TERMS, CURRENCIES } from "@/lib/constants";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { ContactsSection } from "./ContactsSection";
import { BankAccountsSection } from "./BankAccountsSection";
import { cn } from "@/lib/utils";

export type CompanyFormValues = Omit<CompanyInput, "contacts" | "bankAccounts"> & {
  contacts: Array<
    NonNullable<CompanyInput["contacts"]>[number] & { id?: string }
  >;
  bankAccounts: Array<
    NonNullable<CompanyInput["bankAccounts"]>[number] & { id?: string }
  >;
};

const defaultContact = {
  name: "",
  designation: "",
  phone: "",
  email: "",
  isPrimary: false,
};

export interface CompanyFormProps {
  defaultValues?: Partial<CompanyFormValues>;
  onSubmit: (data: CompanyFormValues) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
  isSubmitting?: boolean;
}

export function CompanyForm({
  defaultValues,
  onSubmit,
  onCancel,
  submitLabel = "Create Company",
  isSubmitting = false,
}: CompanyFormProps) {
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<CompanyFormValues>({
    resolver: zodResolver(companyFormSchema) as Resolver<CompanyFormValues>,
    defaultValues: defaultValues ?? {
      name: "",
      type: [],
      paymentTerms: "",
      currency: "PKR",
      taxNumber: "",
      address: "",
      city: "",
      country: "",
      notes: "",
      contacts: [defaultContact],
      bankAccounts: [],
    },
  });

  const contactsArray = useFieldArray({ control, name: "contacts" });
  const bankAccountsArray = useFieldArray({ control, name: "bankAccounts" });

  const selectedTypes = watch("type") ?? [];

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const handleTypeToggle = (value: string) => {
    const v = value as CompanyFormValues["type"][number];
    const next = selectedTypes.includes(v)
      ? selectedTypes.filter((t) => t !== v)
      : [...selectedTypes, v];
    setValue("type", next, { shouldDirty: true });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Section 1: Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Company Name *</Label>
            <Input
              id="name"
              {...register("name")}
              placeholder="Company name"
              error={!!errors.name}
            />
            {errors.name?.message && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Company Type(s) *</Label>
            <div className="flex flex-wrap gap-2">
              {COMPANY_TYPES.map(({ value, label }) => (
                <label
                  key={value}
                  className={cn(
                    "inline-flex items-center rounded-md border px-3 py-2 text-sm cursor-pointer transition-colors",
                    selectedTypes.includes(value)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-input hover:bg-muted/50"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={selectedTypes.includes(value)}
                    onChange={() => handleTypeToggle(value)}
                    className="sr-only"
                  />
                  {label}
                </label>
              ))}
            </div>
            {errors.type?.message && (
              <p className="text-xs text-destructive">{errors.type.message}</p>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="paymentTerms">Payment Terms</Label>
              <Select
                value={watch("paymentTerms") || ""}
                onValueChange={(v) => setValue("paymentTerms", v, { shouldDirty: true })}
              >
                <SelectTrigger id="paymentTerms">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_TERMS.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Default Currency</Label>
              <Select
                value={watch("currency") || "PKR"}
                onValueChange={(v) => setValue("currency", v, { shouldDirty: true })}
              >
                <SelectTrigger id="currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="taxNumber">Tax Number (NTN/STRN)</Label>
            <Input
              id="taxNumber"
              {...register("taxNumber")}
              placeholder="Tax number"
            />
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Address & Location */}
      <Card>
        <CardHeader>
          <CardTitle>Address & Location</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <textarea
              id="address"
              {...register("address")}
              rows={2}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Street address"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" {...register("city")} placeholder="City" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input id="country" {...register("country")} placeholder="Country" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 3: Contact Persons */}
      <Card>
        <CardHeader>
          <CardTitle>Contact Persons</CardTitle>
        </CardHeader>
        <CardContent>
          <ContactsSection fieldArray={contactsArray} register={register} errors={errors} />
        </CardContent>
      </Card>

      {/* Section 4: Bank Account Details */}
      <Card>
        <CardHeader>
          <CardTitle>Bank Account Details</CardTitle>
        </CardHeader>
        <CardContent>
          <BankAccountsSection fieldArray={bankAccountsArray} register={register} errors={errors} />
        </CardContent>
      </Card>

      {/* Section 5: Additional Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <textarea
            id="notes"
            {...register("notes")}
            rows={3}
            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Internal notes..."
          />
        </CardContent>
      </Card>

      <div className="flex gap-3 justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
