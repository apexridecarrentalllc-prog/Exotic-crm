"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { CompanyForm, type CompanyFormValues } from "@/components/companies/CompanyForm";
import toast from "react-hot-toast";

export default function NewCompanyPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: CompanyFormValues) => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/companies", {
        method: "POST",
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
          contacts: data.contacts?.length ? data.contacts : undefined,
          bankAccounts: data.bankAccounts?.length ? data.bankAccounts : undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to create company");
      }
      const company = await res.json();
      toast.success("Company created successfully");
      router.push(`/companies/${company.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create company");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Add Company"
        breadcrumbs={[
          { label: "Companies", href: "/companies" },
          { label: "New", href: "/companies/new" },
        ]}
      />
      <CompanyForm
        onSubmit={handleSubmit}
        onCancel={() => router.push("/companies")}
        submitLabel="Create Company"
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
