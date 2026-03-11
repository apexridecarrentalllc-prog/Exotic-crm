// ============ ENUMS (match Prisma) ============

export type UserRole =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "ACCOUNTS_MANAGER"
  | "OPERATIONS_STAFF"
  | "VIEW_ONLY";

export type CompanyType =
  | "CLEARING_AGENT"
  | "TRANSPORTER"
  | "WAREHOUSE"
  | "CONSULTANT"
  | "FREIGHT_FORWARDER"
  | "CUSTOMS_AGENT"
  | "OTHER";

export type ShipmentType = "IMPORT" | "EXPORT";

export type ShipmentStatus =
  | "ORDER_CREATED"
  | "PORT_CLEARANCE"
  | "CLEARED"
  | "IN_TRANSIT"
  | "AT_WAREHOUSE"
  | "DELIVERED"
  | "CLOSED";

export type StageStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "SKIPPED";

export type InvoiceStatus =
  | "DRAFT"
  | "SENT"
  | "PARTIALLY_PAID"
  | "PAID"
  | "OVERDUE"
  | "CANCELLED";

export type PaymentMethod = "BANK_TRANSFER" | "CHEQUE" | "CASH" | "ONLINE";

export type DocumentType =
  | "BILL_OF_LADING"
  | "PORT_CLEARANCE"
  | "CUSTOMS_DECLARATION"
  | "DELIVERY_RECEIPT"
  | "INVOICE_COPY"
  | "TRANSPORT_DOC"
  | "INSURANCE"
  | "OTHER";

export type NotificationType =
  | "INVOICE_OVERDUE"
  | "PAYMENT_REMINDER"
  | "SHIPMENT_DELAYED"
  | "MISSING_DOCUMENT"
  | "SECURITY_ALERT"
  | "GENERAL";

export type CreditNoteStatus = "DRAFT" | "ISSUED" | "APPLIED" | "CANCELLED";

export type Currency = "PKR" | "USD" | "EUR" | "GBP" | "AED" | "CNY";

// ============ ENTITY TYPES ============

export interface Company {
  id: string;
  name: string;
  type: CompanyType[];
  address?: string | null;
  city?: string | null;
  country?: string | null;
  notes?: string | null;
  isActive: boolean;
  paymentTerms?: string | null;
  currency: string;
  taxNumber?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CompanyContact {
  id: string;
  companyId: string;
  name: string;
  designation?: string | null;
  phone?: string | null;
  email?: string | null;
  isPrimary: boolean;
  createdAt: Date;
}

export interface BankAccount {
  id: string;
  companyId: string;
  bankName: string;
  accountNumber: string;
  iban?: string | null;
  branchName?: string | null;
  isDefault: boolean;
}

export interface Shipment {
  id: string;
  referenceNumber: string;
  type: ShipmentType;
  status: ShipmentStatus;
  origin: string;
  destination: string;
  goodsDescription: string;
  containerNumber?: string | null;
  awbNumber?: string | null;
  weight?: number | null;
  volume?: number | null;
  cargoValue?: number | null;
  currency: string;
  isUrgent: boolean;
  internalNotes?: string | null;
  orderDate: Date;
  expectedDelivery?: Date | null;
  actualDelivery?: Date | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ShipmentStage {
  id: string;
  shipmentId: string;
  companyId: string;
  stageName: string;
  stageOrder: number;
  status: StageStatus;
  startDate?: Date | null;
  completedDate?: Date | null;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  shipmentId: string;
  companyId: string;
  createdById: string;
  status: InvoiceStatus;
  issueDate: Date;
  dueDate: Date;
  currency: string;
  exchangeRate: number;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  withholdingTax: number;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  notes?: string | null;
  sentAt?: Date | null;
  approvedById?: string | null;
  approvedAt?: Date | null;
  cancelledAt?: Date | null;
  cancelReason?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface InvoiceLineItem {
  id: string;
  invoiceId: string;
  description: string;
  quantity: number;
  unitRate: number;
  amount: number;
  taxRate: number;
  sortOrder: number;
}

export interface Payment {
  id: string;
  invoiceId: string;
  companyId: string;
  shipmentId?: string | null;
  recordedById: string;
  amount: number;
  currency: string;
  exchangeRate: number;
  paymentDate: Date;
  method: PaymentMethod;
  referenceNumber?: string | null;
  bankName?: string | null;
  notes?: string | null;
  isAdvance: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Document {
  id: string;
  shipmentId: string;
  uploadedById: string;
  type: DocumentType;
  fileName: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  filePath: string;
  version: number;
  isLatest: boolean;
  previousVersionId?: string | null;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  relatedId?: string | null;
  relatedType?: string | null;
  createdAt: Date;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: Date;
}

export interface DashboardStats {
  totalCompanies: number;
  totalShipments: number;
  totalInvoices: number;
  pendingPayments: number;
  overdueInvoices: number;
  recentActivity?: Array<{
    id: string;
    type: string;
    description: string;
    createdAt: Date;
  }>;
}

export interface DashboardApiResponse {
  stats: {
    activeShipments: number;
    totalInvoicedThisMonth: number;
    totalCollectedThisMonth: number;
    totalOutstanding: number;
    overdueInvoices: number;
    pendingDocuments: number;
    shipmentsThisMonth: number;
    revenueGrowth: number;
  };
  recentShipments: Array<{
    id: string;
    referenceNumber: string;
    type: string;
    status: string;
    origin: string;
    destination: string;
    createdAt: string;
    companyNames: string;
  }>;
  overdueInvoicesList: Array<{
    id: string;
    invoiceNumber: string;
    companyName: string;
    balanceAmount: number;
    currency: string;
    dueDate: string;
  }>;
  monthlyRevenue: Array<{ month: string; invoiced: number; collected: number }>;
  shipmentsByStatus: Array<{ status: string; count: number }>;
  topCompaniesByRevenue: Array<{
    companyId: string;
    companyName: string;
    totalInvoiced: number;
  }>;
}

// ============ PAGINATION & API ============

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

// ============ USER API REQUEST/RESPONSE ============

export interface UserListItem {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  avatar?: string | null;
  lastLogin?: Date | null;
  createdAt: Date;
}

export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface UpdateUserRequest {
  name?: string;
  role?: UserRole;
  isActive?: boolean;
}
