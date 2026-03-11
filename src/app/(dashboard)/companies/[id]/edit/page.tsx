"use client";

import { useRouter, useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { CompanyForm, type CompanyFormValues } from "@/components/companies/CompanyForm";
import toast from "react-hot-toast";
import { Loader2 } from "lucide-react";

export default function EditCompanyPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [defaultValues, setDefaultValues] = useState<Partial<CompanyFormValues> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/companies/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Company not found");
        return res.json();
      })
      .then((company) => {
        setDefaultValues({
          name: company.name,
          type: company.type ?? [],
          address: company.address ?? "",
          city: company.city ?? "",
          country: company.country ?? "",
          notes: company.notes ?? "",
          paymentTerms: company.paymentTerms ?? "",
          currency: company.currency ?? "PKR",
          taxNumber: company.taxNumber ?? "",
          contacts:
            company.contacts?.length > 0
              ? company.contacts.map((c: { id: string; name: string; designation?: string | null; phone?: string | null; email?: string | null; isPrimary: boolean }) => ({
                  id: c.id,
                  name: c.name,
                  designation: c.designation ?? "",
                  phone: c.phone ?? "",
                  email: c.email ?? "",
                  isPrimary: c.isPrimary ?? false,
                }))
              : [{ name: "", designation: "", phone: "", email: "", isPrimary: false }],
          bankAccounts:
            company.bankAccounts?.length > 0
              ? company.bankAccounts.map((b: { id: string; bankName: string; accountNumber: string; iban?: string | null; branchName?: string | null; isDefault: boolean }) => ({
                  id: b.id,
                  bankName: b.bankName,
                  accountNumber: b.accountNumber,
                  iban: b.iban ?? "",
                  branchName: b.branchName ?? "",
                  isDefault: b.isDefault ?? false,
                }))
              : [],
        });
      })
      .catch(() => setError("Failed to load company"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (data: CompanyFormValues) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/companies/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          type: data.type,
          address: data.address || undefined,
          city: data.city || undefined,
          country: data.country || undefined,
          notes: data.notes || undefined,
          paymentTerms: data.paymentTerms || undefined,
          currency: data.currency || "PKR",
          taxNumber: data.taxNumber || undefined,
          contacts: data.contacts?.map((c) => ({
            id: (c as { id?: string }).id,
            name: c.name,
            designation: c.designation || undefined,
            phone: c.phone || undefined,
            email: c.email && c.email !== "" ? c.email : undefined,
            isPrimary: c.isPrimary ?? false,
          })),
          bankAccounts: data.bankAccounts?.map((b) => ({
            id: (b as { id?: string }).id,
            bankName: b.bankName,
            accountNumber: b.accountNumber,
            iban: b.iban || undefined,
            branchName: b.branchName || undefined,
            isDefault: b.isDefault ?? false,
          })),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to update company");
      }
      toast.success("Company updated successfully");
      router.push(`/companies/${id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update company");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !defaultValues) {
    return (
      <div className="space-y-6">
        <PageHeader title="Edit Company" breadcrumbs={[{ label: "Companies", href: "/companies" }, { label: "Edit" }]} />
        <p className="text-destructive">{error ?? "Company not found"}</p>
        <button type="button" onClick={() => router.push("/companies")} className="text-primary hover:underline">
          Back to companies
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Edit Company"
        breadcrumbs={[
          { label: "Companies", href: "/companies" },
          { label: defaultValues.name ?? "Company", href: `/companies/${id}` },
          { label: "Edit", href: `/companies/${id}/edit` },
        ]}
      />
      <CompanyForm
        defaultValues={defaultValues}
        onSubmit={handleSubmit}
        onCancel={() => router.push(`/companies/${id}`)}
        submitLabel="Save Changes"
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
