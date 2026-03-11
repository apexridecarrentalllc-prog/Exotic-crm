"use client";

import * as React from "react";
import { UseFieldArrayReturn, UseFormRegister } from "react-hook-form";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Plus, Trash2 } from "lucide-react";
import { CompanyFormValues } from "./CompanyForm";

export interface BankAccountsSectionProps {
  fieldArray: UseFieldArrayReturn<CompanyFormValues, "bankAccounts", "id">;
  register: UseFormRegister<CompanyFormValues>;
  errors?: { bankAccounts?: { message?: string }; [key: string]: unknown };
}

export function BankAccountsSection({ fieldArray, register, errors }: BankAccountsSectionProps) {
  const { fields, append, remove } = fieldArray;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Bank Account Details</h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            append({
              bankName: "",
              accountNumber: "",
              iban: "",
              branchName: "",
              isDefault: false,
            })
          }
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Bank Account
        </Button>
      </div>
      {errors?.bankAccounts && typeof errors.bankAccounts === "object" && "message" in errors.bankAccounts && (
        <p className="text-sm text-destructive">{(errors.bankAccounts as { message?: string }).message}</p>
      )}
      {fields.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 border rounded-lg border-dashed text-center">
          No bank accounts. Add one if needed.
        </p>
      ) : (
        fields.map((field, index) => (
          <div
            key={field.id}
            className="rounded-lg border bg-card p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">
                Account {index + 1}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => remove(index)}
                aria-label="Remove bank account"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={`bankAccounts.${index}.bankName`}>Bank Name *</Label>
                <Input
                  id={`bankAccounts.${index}.bankName`}
                  {...register(`bankAccounts.${index}.bankName`, {
                    required: "Bank name is required",
                  })}
                  placeholder="Bank name"
                  error={!!(Array.isArray(errors?.bankAccounts) ? (errors.bankAccounts as Record<string, unknown>[])[index]?.bankName : false)}
                />
                {Array.isArray(errors?.bankAccounts) && (errors.bankAccounts as { bankName?: { message?: string } }[])[index]?.bankName?.message && (
                  <p className="text-xs text-destructive">
                    {(errors.bankAccounts as { bankName?: { message?: string } }[])[index].bankName?.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor={`bankAccounts.${index}.accountNumber`}>Account Number *</Label>
                <Input
                  id={`bankAccounts.${index}.accountNumber`}
                  {...register(`bankAccounts.${index}.accountNumber`, {
                    required: "Account number is required",
                  })}
                  placeholder="Account number"
                  error={!!(Array.isArray(errors?.bankAccounts) ? (errors.bankAccounts as Record<string, unknown>[])[index]?.accountNumber : false)}
                />
                {Array.isArray(errors?.bankAccounts) && (errors.bankAccounts as { accountNumber?: { message?: string } }[])[index]?.accountNumber?.message && (
                  <p className="text-xs text-destructive">
                    {(errors.bankAccounts as { accountNumber?: { message?: string } }[])[index].accountNumber?.message}
                  </p>
                )}
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor={`bankAccounts.${index}.iban`}>IBAN</Label>
                <Input
                  id={`bankAccounts.${index}.iban`}
                  {...register(`bankAccounts.${index}.iban`)}
                  placeholder="PK00XXXX0000000000000000"
                />
                {Array.isArray(errors?.bankAccounts) && (errors.bankAccounts as { iban?: { message?: string } }[])[index]?.iban?.message && (
                  <p className="text-xs text-destructive">
                    {(errors.bankAccounts as { iban?: { message?: string } }[])[index].iban?.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor={`bankAccounts.${index}.branchName`}>Branch</Label>
                <Input
                  id={`bankAccounts.${index}.branchName`}
                  {...register(`bankAccounts.${index}.branchName`)}
                  placeholder="Branch name"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                {...register(`bankAccounts.${index}.isDefault`)}
                className="rounded border-input"
              />
              Mark as Default
            </label>
          </div>
        ))
      )}
    </div>
  );
}
