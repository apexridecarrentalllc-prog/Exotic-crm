"use client";

import * as React from "react";
import { UseFieldArrayReturn, UseFormRegister } from "react-hook-form";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Plus, Trash2 } from "lucide-react";
import { CompanyFormValues } from "./CompanyForm";

type ContactFieldError = { name?: { message?: string }; email?: { message?: string } };
export interface ContactsSectionProps {
  fieldArray: UseFieldArrayReturn<CompanyFormValues, "contacts", "id">;
  register: UseFormRegister<CompanyFormValues>;
  errors?: { contacts?: { message?: string } | ContactFieldError[] };
}

export function ContactsSection({ fieldArray, register, errors }: ContactsSectionProps) {
  const { fields, append, remove } = fieldArray;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Contact Persons</h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            append({
              name: "",
              designation: "",
              phone: "",
              email: "",
              isPrimary: false,
            })
          }
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Another Contact
        </Button>
      </div>
      {errors?.contacts && !Array.isArray(errors.contacts) && "message" in errors.contacts && (
        <p className="text-sm text-destructive">{(errors.contacts as { message?: string }).message}</p>
      )}
      {fields.map((field, index) => (
        <div
          key={field.id}
          className="rounded-lg border bg-card p-4 space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              Contact {index + 1}
            </span>
            {fields.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => remove(index)}
                aria-label="Remove contact"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`contacts.${index}.name`}>Name *</Label>
              <Input
                id={`contacts.${index}.name`}
                {...register(`contacts.${index}.name`, {
                  required: "Name is required",
                })}
                placeholder="Full name"
                error={!!(Array.isArray(errors?.contacts) && errors.contacts[index])}
              />
              {Array.isArray(errors?.contacts) && (errors.contacts[index] as ContactFieldError)?.name?.message && (
                <p className="text-xs text-destructive">
                  {(errors.contacts[index] as ContactFieldError).name?.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor={`contacts.${index}.designation`}>Designation</Label>
              <Input
                id={`contacts.${index}.designation`}
                {...register(`contacts.${index}.designation`)}
                placeholder="Job title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`contacts.${index}.phone`}>Phone</Label>
              <Input
                id={`contacts.${index}.phone`}
                {...register(`contacts.${index}.phone`)}
                placeholder="+92 300 1234567"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`contacts.${index}.email`}>Email</Label>
              <Input
                id={`contacts.${index}.email`}
                type="email"
                {...register(`contacts.${index}.email`)}
                placeholder="email@company.com"
              />
              {Array.isArray(errors?.contacts) && (errors.contacts[index] as ContactFieldError)?.email?.message && (
                <p className="text-xs text-destructive">
                  {(errors.contacts[index] as ContactFieldError).email?.message}
                </p>
              )}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
                {...register(`contacts.${index}.isPrimary`)}
              className="rounded border-input"
            />
            Mark as Primary
          </label>
        </div>
      ))}
    </div>
  );
}
