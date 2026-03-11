import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean(),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const createUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().min(1, "Email is required").email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum([
    "SUPER_ADMIN",
    "ADMIN",
    "ACCOUNTS_MANAGER",
    "OPERATIONS_STAFF",
    "VIEW_ONLY",
  ]),
  forcePasswordChangeOnFirstLogin: z.boolean().optional().default(false),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  role: z
    .enum([
      "SUPER_ADMIN",
      "ADMIN",
      "ACCOUNTS_MANAGER",
      "OPERATIONS_STAFF",
      "VIEW_ONLY",
    ])
    .optional(),
  isActive: z.boolean().optional(),
});
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "New password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New password and confirmation do not match",
    path: ["confirmPassword"],
  });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

const companyTypeEnum = z.enum([
  "CLEARING_AGENT",
  "TRANSPORTER",
  "WAREHOUSE",
  "CONSULTANT",
  "FREIGHT_FORWARDER",
  "CUSTOMS_AGENT",
  "OTHER",
]);

export const contactSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  designation: z.string().max(100).optional(),
  phone: z.string().max(50).optional(),
  email: z.union([z.string().email("Invalid email"), z.literal("")]).optional(),
  isPrimary: z.boolean().optional().default(false),
});

export const bankAccountSchema = z
  .object({
    bankName: z.string().min(1, "Bank name is required").max(200),
    accountNumber: z.string().min(1, "Account number is required").max(50),
    iban: z.string().max(34).optional(),
    branchName: z.string().max(200).optional(),
    isDefault: z.boolean().optional().default(false),
  })
  .refine(
    (data) => {
      if (!data.iban) return true;
      return /^[A-Z]{2}[0-9]{2}[A-Z0-9]{4}[0-9]{7}([A-Z0-9]?){0,16}$/i.test(
        data.iban.replace(/\s/g, "")
      );
    },
    { message: "Invalid IBAN format", path: ["iban"] }
  );

export const companySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(200),
  type: z.array(companyTypeEnum).min(1, "At least one company type is required"),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  notes: z.string().max(2000).optional(),
  paymentTerms: z.string().max(100).optional(),
  currency: z.string().max(10).optional().default("PKR"),
  taxNumber: z.string().max(50).optional(),
  contacts: z.array(contactSchema).optional(),
  bankAccounts: z.array(bankAccountSchema).optional(),
});

/** Form schema: requires at least one contact */
export const companyFormSchema = companySchema.refine(
  (data) => !data.contacts || data.contacts.length >= 1,
  { message: "At least one contact is required", path: ["contacts"] }
);

export const companyUpdateSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  type: z.array(companyTypeEnum).min(1).optional(),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  notes: z.string().max(2000).optional(),
  isActive: z.boolean().optional(),
  paymentTerms: z.string().max(100).optional(),
  currency: z.string().max(10).optional(),
  taxNumber: z.string().max(50).optional(),
  contacts: z.array(contactSchema.extend({ id: z.string().cuid().optional() })).optional(),
  bankAccounts: z
    .array(bankAccountSchema.extend({ id: z.string().cuid().optional() }))
    .optional(),
});

export type CompanyInput = z.infer<typeof companySchema>;
export type CompanyUpdateInput = z.infer<typeof companyUpdateSchema>;
export type ContactInput = z.infer<typeof contactSchema>;
export type BankAccountInput = z.infer<typeof bankAccountSchema>;

// ============ SHIPMENT ============

export const shipmentTypeEnum = z.enum(["IMPORT", "EXPORT"]);
export const shipmentStatusEnum = z.enum([
  "ORDER_CREATED",
  "PORT_CLEARANCE",
  "CLEARED",
  "IN_TRANSIT",
  "AT_WAREHOUSE",
  "DELIVERED",
  "CLOSED",
  "CANCELLED",
]);
export const stageStatusEnum = z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "SKIPPED"]);

export const shipmentStageInputSchema = z.object({
  stageName: z.string().min(1, "Stage name is required").max(200),
  companyId: z.string().min(1, "Company is required"),
  stageOrder: z.number().int().min(0),
  notes: z.string().max(500).optional(),
});

export const createShipmentSchema = z.object({
  type: shipmentTypeEnum,
  origin: z.string().min(1, "Origin is required").max(200),
  destination: z.string().min(1, "Destination is required").max(200),
  goodsDescription: z.string().min(1, "Goods description is required").max(1000),
  containerNumber: z.string().max(50).optional(),
  awbNumber: z.string().max(50).optional(),
  weight: z.number().nonnegative().optional(),
  volume: z.number().nonnegative().optional(),
  cargoValue: z.number().nonnegative().optional(),
  currency: z.string().max(10).optional().default("PKR"),
  isUrgent: z.boolean().optional().default(false),
  internalNotes: z.string().max(2000).optional(),
  orderDate: z.coerce.date().optional(),
  expectedDelivery: z.coerce.date().optional(),
  stages: z.array(shipmentStageInputSchema).optional(),
});
export type CreateShipmentInput = z.infer<typeof createShipmentSchema>;

export const updateShipmentSchema = z.object({
  origin: z.string().min(1).max(200).optional(),
  destination: z.string().min(1).max(200).optional(),
  goodsDescription: z.string().min(1).max(1000).optional(),
  containerNumber: z.string().max(50).optional().nullable(),
  awbNumber: z.string().max(50).optional().nullable(),
  weight: z.number().nonnegative().optional().nullable(),
  volume: z.number().nonnegative().optional().nullable(),
  cargoValue: z.number().nonnegative().optional().nullable(),
  currency: z.string().max(10).optional(),
  isUrgent: z.boolean().optional(),
  internalNotes: z.string().max(2000).optional().nullable(),
  expectedDelivery: z.coerce.date().optional().nullable(),
});
export type UpdateShipmentInput = z.infer<typeof updateShipmentSchema>;

export const shipmentStatusUpdateSchema = z.object({
  status: shipmentStatusEnum,
  notes: z.string().max(500).optional(),
});
export type ShipmentStatusUpdateInput = z.infer<typeof shipmentStatusUpdateSchema>;

export const updateShipmentStageSchema = z.object({
  stageName: z.string().min(1).max(200).optional(),
  companyId: z.string().min(1).optional(),
  stageOrder: z.number().int().min(0).optional(),
  status: stageStatusEnum.optional(),
  startDate: z.coerce.date().optional().nullable(),
  completedDate: z.coerce.date().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});
export type UpdateShipmentStageInput = z.infer<typeof updateShipmentStageSchema>;

export const bulkStagesUpdateSchema = z.object({
  stages: z.array(
    z.object({
      id: z.string().optional(),
      stageName: z.string().min(1).max(200),
      companyId: z.string().min(1),
      stageOrder: z.number().int().min(0),
      notes: z.string().max(500).optional(),
    })
  ),
});
export type BulkStagesUpdateInput = z.infer<typeof bulkStagesUpdateSchema>;

export const addShipmentCommentSchema = z.object({
  content: z.string().min(1, "Content is required").max(2000),
});
export type AddShipmentCommentInput = z.infer<typeof addShipmentCommentSchema>;

function excelSerialToDate(n: number): Date {
  const utc = (n - 25569) * 86400 * 1000;
  return new Date(utc);
}

export const bulkImportShipmentRowSchema = z.object({
  Type: z.enum(["IMPORT", "EXPORT", "Import", "Export"]).transform((v) => (String(v).toUpperCase() === "IMPORT" ? "IMPORT" : "EXPORT")),
  Origin: z.string().min(1),
  Destination: z.string().min(1),
  GoodsDescription: z.string().min(1),
  ContainerNumber: z.string().optional().default(""),
  CargoValue: z.union([z.number(), z.string()]).optional().transform((v) => (typeof v === "string" ? parseFloat(v) || 0 : v ?? 0)),
  OrderDate: z
    .union([z.coerce.date(), z.string(), z.number()])
    .optional()
    .transform((v) => {
      if (v == null) return new Date();
      if (v instanceof Date) return v;
      if (typeof v === "number") return excelSerialToDate(v);
      return new Date(v);
    }),
});
export type BulkImportShipmentRow = z.infer<typeof bulkImportShipmentRowSchema>;

// ============ INVOICE ============

export const invoiceStatusEnum = z.enum([
  "DRAFT",
  "SENT",
  "PARTIALLY_PAID",
  "PAID",
  "OVERDUE",
  "CANCELLED",
]);
export const paymentMethodEnum = z.enum([
  "BANK_TRANSFER",
  "CHEQUE",
  "CASH",
  "ONLINE",
]);

export const invoiceLineItemSchema = z.object({
  description: z.string().min(1, "Description is required").max(500),
  quantity: z.number().positive("Quantity must be positive"),
  unitRate: z.number().nonnegative("Unit rate must be non-negative"),
  taxRate: z.number().min(0).max(100).optional().default(0),
});

export const createInvoiceSchema = z.object({
  shipmentId: z.string().min(1, "Shipment is required"),
  companyId: z.string().min(1, "Company is required"),
  dueDate: z.coerce.date(),
  currency: z.string().max(10).optional().default("PKR"),
  taxRate: z.number().min(0).max(100).optional().default(0),
  withholdingTax: z.number().nonnegative().optional().default(0),
  notes: z.string().max(2000).optional(),
  lineItems: z.array(invoiceLineItemSchema).min(1, "At least one line item is required"),
});
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;

export const updateInvoiceSchema = z.object({
  dueDate: z.coerce.date().optional(),
  currency: z.string().max(10).optional(),
  taxRate: z.number().min(0).max(100).optional(),
  withholdingTax: z.number().nonnegative().optional(),
  notes: z.string().max(2000).optional().nullable(),
  lineItems: z.array(invoiceLineItemSchema).min(1).optional(),
});
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;

export const cancelInvoiceSchema = z.object({
  reason: z.string().min(1, "Reason is required").max(500),
});
export type CancelInvoiceInput = z.infer<typeof cancelInvoiceSchema>;

export const recordPaymentSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  paymentDate: z.coerce.date(),
  method: paymentMethodEnum,
  referenceNumber: z.string().max(100).optional(),
  bankName: z.string().max(200).optional(),
  notes: z.string().max(500).optional(),
});
export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;

export const createCreditNoteSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  reason: z.string().min(1, "Reason is required").max(500),
});
export type CreateCreditNoteInput = z.infer<typeof createCreditNoteSchema>;
