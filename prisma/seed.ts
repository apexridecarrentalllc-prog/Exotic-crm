// Load env before other imports that use process.env
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env.local"), override: true });

import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Clear existing data in correct order (respecting FKs)
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.invoiceRevision.deleteMany();
  await prisma.invoiceLineItem.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.creditNote.deleteMany();
  await prisma.emailLog.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.document.deleteMany();
  await prisma.shipmentComment.deleteMany();
  await prisma.shipmentStatusHistory.deleteMany();
  await prisma.shipmentStage.deleteMany();
  await prisma.shipment.deleteMany();
  await prisma.bankAccount.deleteMany();
  await prisma.companyContact.deleteMany();
  await prisma.company.deleteMany();
  await prisma.systemSettings.deleteMany();
  await prisma.exchangeRate.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();

  const hash = (password: string) => bcrypt.hashSync(password, 10);

  // 1. Users (5)
  const superAdmin = await prisma.user.create({
    data: { name: "Super Admin", email: "super.admin@iemanager.com", password: hash("SuperAdmin@123"), role: "SUPER_ADMIN", isActive: true },
  });
  const admin = await prisma.user.create({
    data: { name: "Admin", email: "admin@iemanager.com", password: hash("Admin@123"), role: "ADMIN", isActive: true },
  });
  const accountsManager = await prisma.user.create({
    data: { name: "Accounts Manager", email: "accounts@iemanager.com", password: hash("Accounts@123"), role: "ACCOUNTS_MANAGER", isActive: true },
  });
  const opsStaff = await prisma.user.create({
    data: { name: "Operations Staff", email: "operations@iemanager.com", password: hash("Ops@123"), role: "OPERATIONS_STAFF", isActive: true },
  });
  const manager = await prisma.user.create({
    data: { name: "View Only Manager", email: "manager@iemanager.com", password: hash("Manager@123"), role: "VIEW_ONLY", isActive: true },
  });
  console.log("Created 5 users");

  // 2. Companies (6) with contacts and bank accounts
  const alHaram = await prisma.company.create({
    data: {
      name: "Al-Haram Clearing Agents",
      type: ["CLEARING_AGENT"],
      address: "Block 5, Keamari",
      city: "Karachi",
      country: "Pakistan",
      paymentTerms: "Net 30",
      currency: "PKR",
      isActive: true,
      contacts: {
        create: [
          { name: "Tariq Mehmood", designation: "Director", email: "tariq@alharamclearing.com", phone: "+92-21-35671234", isPrimary: true },
          { name: "Nadia Khan", designation: "Accounts", email: "nadia@alharamclearing.com", phone: "+92-300-9876543", isPrimary: false },
          { name: "Rashid Ali", designation: "Operations", phone: "+92-321-5551234", isPrimary: false },
        ],
      },
      bankAccounts: {
        create: [
          { bankName: "HBL", accountNumber: "1234567890", iban: "PK36HABB0001234567890123", branchName: "Keamari", isDefault: true },
          { bankName: "MCB", accountNumber: "9876543210", branchName: "Karachi Port", isDefault: false },
        ],
      },
    },
  });
  const fastFreight = await prisma.company.create({
    data: {
      name: "Fast Freight & Logistics",
      type: ["TRANSPORTER"],
      address: "45 Highway Avenue",
      city: "Lahore",
      country: "Pakistan",
      paymentTerms: "Net 15",
      currency: "PKR",
      isActive: true,
      contacts: {
        create: [
          { name: "Farhan Mahmood", designation: "Logistics Head", email: "farhan@fastfreight.com", phone: "+92-42-35678901", isPrimary: true },
          { name: "Ayesha Siddiqui", designation: "Dispatch", phone: "+92-300-4445566", isPrimary: false },
        ],
      },
      bankAccounts: {
        create: [
          { bankName: "UBL", accountNumber: "5555666677", branchName: "Lahore Main", isDefault: true },
        ],
      },
    },
  });
  const superiorWarehousing = await prisma.company.create({
    data: {
      name: "Superior Warehousing",
      type: ["WAREHOUSE"],
      address: "SITE Area, Landhi",
      city: "Karachi",
      country: "Pakistan",
      paymentTerms: "Net 30",
      currency: "PKR",
      isActive: true,
      contacts: {
        create: [
          { name: "Khalid Rashid", designation: "Warehouse Manager", email: "khalid@superiorwarehouse.com", phone: "+92-21-34567890", isPrimary: true },
          { name: "Sana Malik", designation: "Billing", email: "sana@superiorwarehouse.com", isPrimary: false },
        ],
      },
      bankAccounts: {
        create: [
          { bankName: "ABL", accountNumber: "1122334455", branchName: "Landhi", isDefault: true },
        ],
      },
    },
  });
  const tradeConsultants = await prisma.company.create({
    data: {
      name: "Trade Consultants Ltd",
      type: ["CONSULTANT"],
      address: "Blue Area, F-6",
      city: "Islamabad",
      country: "Pakistan",
      paymentTerms: "Advance",
      currency: "PKR",
      isActive: true,
      contacts: {
        create: [
          { name: "Omar Sheikh", designation: "Lead Consultant", email: "omar@tradeconsultants.pk", phone: "+92-51-2345678", isPrimary: true },
          { name: "Zainab Hussain", designation: "Client Relations", phone: "+92-333-7778899", isPrimary: false },
        ],
      },
      bankAccounts: {
        create: [
          { bankName: "HBL", accountNumber: "6677889900", branchName: "Blue Area", isDefault: true },
        ],
      },
    },
  });
  const pacificFreight = await prisma.company.create({
    data: {
      name: "Pacific Freight Co.",
      type: ["FREIGHT_FORWARDER", "CLEARING_AGENT"],
      address: "Port Qasim Road",
      city: "Karachi",
      country: "Pakistan",
      paymentTerms: "Net 45",
      currency: "PKR",
      isActive: true,
      contacts: {
        create: [
          { name: "Imran Hassan", designation: "Director", email: "imran@pacificfreight.com", phone: "+92-21-37890123", isPrimary: true },
          { name: "Sara Ahmed", designation: "Operations", email: "sara@pacificfreight.com", isPrimary: false },
        ],
      },
      bankAccounts: {
        create: [
          { bankName: "MCB", accountNumber: "2233445566", branchName: "Port Qasim", isDefault: true },
          { bankName: "HBL", accountNumber: "7788990011", branchName: "Clifton", isDefault: false },
        ],
      },
    },
  });
  const swiftTransport = await prisma.company.create({
    data: {
      name: "Swift Transport Services",
      type: ["TRANSPORTER"],
      address: "Multan Road",
      city: "Lahore",
      country: "Pakistan",
      paymentTerms: "Net 15",
      currency: "PKR",
      isActive: true,
      contacts: {
        create: [
          { name: "Bilal Akhtar", designation: "Fleet Manager", email: "bilal@swifttransport.pk", phone: "+92-42-36543210", isPrimary: true },
          { name: "Hina Raza", designation: "Accounts", phone: "+92-321-6667788", isPrimary: false },
        ],
      },
      bankAccounts: {
        create: [
          { bankName: "UBL", accountNumber: "3344556677", branchName: "Multan Road", isDefault: true },
        ],
      },
    },
  });
  console.log("Created 6 companies with contacts and bank accounts");

  // 3. Shipments (5) with stages — Pakistani ports, realistic goods & values
  const shipment1 = await prisma.shipment.create({
    data: {
      referenceNumber: "SHP-2025-0001",
      type: "IMPORT",
      status: "DELIVERED",
      origin: "Jebel Ali, UAE",
      destination: "Karachi Port, Pakistan",
      goodsDescription: "Electronics - Smartphones & Tablets (CIF)",
      containerNumber: "MSCU1234567",
      weight: 8500,
      volume: 32,
      cargoValue: 125000,
      currency: "USD",
      orderDate: new Date("2025-01-10"),
      expectedDelivery: new Date("2025-02-05"),
      actualDelivery: new Date("2025-02-03"),
      createdById: superAdmin.id,
      stages: {
        create: [
          { companyId: alHaram.id, stageName: "Customs Clearance - Karachi Port", stageOrder: 1, status: "COMPLETED", startDate: new Date("2025-01-22"), completedDate: new Date("2025-01-25") },
          { companyId: superiorWarehousing.id, stageName: "Warehouse Receipt - Landhi", stageOrder: 2, status: "COMPLETED", startDate: new Date("2025-01-26"), completedDate: new Date("2025-01-28") },
          { companyId: fastFreight.id, stageName: "Inland Transport to Lahore", stageOrder: 3, status: "COMPLETED", startDate: new Date("2025-01-29"), completedDate: new Date("2025-02-03") },
        ],
      },
    },
  });
  const shipment2 = await prisma.shipment.create({
    data: {
      referenceNumber: "SHP-2025-0002",
      type: "IMPORT",
      status: "IN_TRANSIT",
      origin: "Singapore",
      destination: "Port Qasim, Pakistan",
      goodsDescription: "Machinery Parts - Industrial Equipment",
      containerNumber: "TEMU9876543",
      weight: 12000,
      volume: 28,
      cargoValue: 85000,
      currency: "USD",
      orderDate: new Date("2025-01-18"),
      expectedDelivery: new Date("2025-02-20"),
      createdById: admin.id,
      stages: {
        create: [
          { companyId: pacificFreight.id, stageName: "Freight & Port Discharge - Port Qasim", stageOrder: 1, status: "COMPLETED", startDate: new Date("2025-02-01"), completedDate: new Date("2025-02-05") },
          { companyId: alHaram.id, stageName: "Customs Clearance", stageOrder: 2, status: "COMPLETED", startDate: new Date("2025-02-06"), completedDate: new Date("2025-02-08") },
          { companyId: swiftTransport.id, stageName: "Inland Transport", stageOrder: 3, status: "IN_PROGRESS", startDate: new Date("2025-02-10") },
        ],
      },
    },
  });
  const shipment3 = await prisma.shipment.create({
    data: {
      referenceNumber: "SHP-2025-0003",
      type: "EXPORT",
      status: "PORT_CLEARANCE",
      origin: "Karachi Port, Pakistan",
      destination: "Rotterdam, Netherlands",
      goodsDescription: "Textiles - Cotton Garments & Home Textiles",
      containerNumber: "HLBU5566778",
      weight: 9500,
      volume: 30,
      cargoValue: 4200000,
      currency: "PKR",
      orderDate: new Date("2025-02-01"),
      expectedDelivery: new Date("2025-03-15"),
      createdById: opsStaff.id,
      stages: {
        create: [
          { companyId: alHaram.id, stageName: "Export Documentation & Port Clearance - Karachi Port", stageOrder: 1, status: "IN_PROGRESS", startDate: new Date("2025-02-12") },
        ],
      },
    },
  });
  const shipment4 = await prisma.shipment.create({
    data: {
      referenceNumber: "SHP-2025-0004",
      type: "IMPORT",
      status: "ORDER_CREATED",
      origin: "Shanghai, China",
      destination: "Port Qasim, Pakistan",
      goodsDescription: "Raw Materials - Steel Coils",
      containerNumber: "COSU4455667",
      weight: 20000,
      volume: 45,
      cargoValue: 95000,
      currency: "USD",
      isUrgent: true,
      internalNotes: "Client requested expedited clearance.",
      orderDate: new Date("2025-02-15"),
      expectedDelivery: new Date("2025-03-25"),
      createdById: superAdmin.id,
      stages: {
        create: [
          { companyId: pacificFreight.id, stageName: "Ocean Freight - Port Qasim", stageOrder: 1, status: "PENDING" },
          { companyId: alHaram.id, stageName: "Customs Clearance", stageOrder: 2, status: "PENDING" },
          { companyId: fastFreight.id, stageName: "Delivery to Faisalabad", stageOrder: 3, status: "PENDING" },
        ],
      },
    },
  });
  const shipment5 = await prisma.shipment.create({
    data: {
      referenceNumber: "SHP-2024-0012",
      type: "EXPORT",
      status: "CLOSED",
      origin: "Karachi Port, Pakistan",
      destination: "Jeddah, Saudi Arabia",
      goodsDescription: "Rice - Basmati (Bags)",
      containerNumber: "OOCL7788990",
      weight: 18000,
      volume: 55,
      cargoValue: 6500000,
      currency: "PKR",
      orderDate: new Date("2024-11-01"),
      expectedDelivery: new Date("2024-11-28"),
      actualDelivery: new Date("2024-11-26"),
      createdById: admin.id,
      stages: {
        create: [
          { companyId: tradeConsultants.id, stageName: "Export Documentation", stageOrder: 1, status: "COMPLETED", startDate: new Date("2024-11-05"), completedDate: new Date("2024-11-08") },
          { companyId: alHaram.id, stageName: "Port Clearance - Karachi Port", stageOrder: 2, status: "COMPLETED", startDate: new Date("2024-11-10"), completedDate: new Date("2024-11-15") },
          { companyId: pacificFreight.id, stageName: "Freight to Jeddah", stageOrder: 3, status: "COMPLETED", startDate: new Date("2024-11-16"), completedDate: new Date("2024-11-26") },
        ],
      },
    },
  });
  console.log("Created 5 shipments with stages");

  // 4. Invoices with line items (2–4 items each: Port Handling, Documentation, etc.)
  const inv1 = await prisma.invoice.create({
    data: {
      invoiceNumber: "INV-2025-0001",
      shipmentId: shipment1.id,
      companyId: alHaram.id,
      createdById: accountsManager.id,
      status: "PAID",
      issueDate: new Date("2025-01-22"),
      dueDate: new Date("2025-02-22"),
      currency: "PKR",
      exchangeRate: 278.5,
      subtotal: 185000,
      taxRate: 0,
      taxAmount: 0,
      withholdingTax: 0,
      totalAmount: 185000,
      paidAmount: 185000,
      balanceAmount: 0,
      sentAt: new Date("2025-01-23"),
      lineItems: {
        create: [
          { description: "Port Handling Fee - Karachi Port", quantity: 1, unitRate: 85000, amount: 85000, taxRate: 0, sortOrder: 1 },
          { description: "Documentation Fee", quantity: 1, unitRate: 45000, amount: 45000, taxRate: 0, sortOrder: 2 },
          { description: "Customs Clearance Charges", quantity: 1, unitRate: 55000, amount: 55000, taxRate: 0, sortOrder: 3 },
        ],
      },
    },
  });
  const inv2 = await prisma.invoice.create({
    data: {
      invoiceNumber: "INV-2025-0002",
      shipmentId: shipment1.id,
      companyId: superiorWarehousing.id,
      createdById: accountsManager.id,
      status: "PAID",
      issueDate: new Date("2025-01-26"),
      dueDate: new Date("2025-02-26"),
      currency: "PKR",
      subtotal: 95000,
      taxRate: 0,
      taxAmount: 0,
      withholdingTax: 0,
      totalAmount: 95000,
      paidAmount: 95000,
      balanceAmount: 0,
      sentAt: new Date("2025-01-27"),
      lineItems: {
        create: [
          { description: "Warehouse Storage (3 days)", quantity: 3, unitRate: 15000, amount: 45000, taxRate: 0, sortOrder: 1 },
          { description: "Handling & Loading", quantity: 1, unitRate: 50000, amount: 50000, taxRate: 0, sortOrder: 2 },
        ],
      },
    },
  });
  const inv3 = await prisma.invoice.create({
    data: {
      invoiceNumber: "INV-2025-0003",
      shipmentId: shipment1.id,
      companyId: fastFreight.id,
      createdById: accountsManager.id,
      status: "PARTIALLY_PAID",
      issueDate: new Date("2025-01-28"),
      dueDate: new Date("2025-02-28"),
      currency: "PKR",
      subtotal: 220000,
      taxRate: 0,
      taxAmount: 0,
      withholdingTax: 0,
      totalAmount: 220000,
      paidAmount: 100000,
      balanceAmount: 120000,
      sentAt: new Date("2025-01-29"),
      lineItems: {
        create: [
          { description: "Inland Transport Karachi to Lahore", quantity: 1, unitRate: 150000, amount: 150000, taxRate: 0, sortOrder: 1 },
          { description: "Documentation Fee", quantity: 1, unitRate: 35000, amount: 35000, taxRate: 0, sortOrder: 2 },
          { description: "Fuel Surcharge", quantity: 1, unitRate: 35000, amount: 35000, taxRate: 0, sortOrder: 3 },
        ],
      },
    },
  });
  const inv4 = await prisma.invoice.create({
    data: {
      invoiceNumber: "INV-2025-0004",
      shipmentId: shipment2.id,
      companyId: pacificFreight.id,
      createdById: accountsManager.id,
      status: "PAID",
      issueDate: new Date("2025-02-02"),
      dueDate: new Date("2025-03-19"),
      currency: "PKR",
      exchangeRate: 279,
      subtotal: 420000,
      taxRate: 0,
      taxAmount: 0,
      withholdingTax: 0,
      totalAmount: 420000,
      paidAmount: 420000,
      balanceAmount: 0,
      sentAt: new Date("2025-02-03"),
      lineItems: {
        create: [
          { description: "Ocean Freight - Singapore to Port Qasim", quantity: 1, unitRate: 280000, amount: 280000, taxRate: 0, sortOrder: 1 },
          { description: "Port Handling Fee - Port Qasim", quantity: 1, unitRate: 85000, amount: 85000, taxRate: 0, sortOrder: 2 },
          { description: "Documentation Fee", quantity: 1, unitRate: 55000, amount: 55000, taxRate: 0, sortOrder: 3 },
        ],
      },
    },
  });
  const inv5 = await prisma.invoice.create({
    data: {
      invoiceNumber: "INV-2025-0005",
      shipmentId: shipment2.id,
      companyId: alHaram.id,
      createdById: accountsManager.id,
      status: "SENT",
      issueDate: new Date("2025-02-07"),
      dueDate: new Date("2025-03-24"),
      currency: "PKR",
      subtotal: 115000,
      taxRate: 0,
      taxAmount: 0,
      withholdingTax: 0,
      totalAmount: 115000,
      paidAmount: 0,
      balanceAmount: 115000,
      sentAt: new Date("2025-02-08"),
      lineItems: {
        create: [
          { description: "Customs Clearance - Port Qasim", quantity: 1, unitRate: 75000, amount: 75000, taxRate: 0, sortOrder: 1 },
          { description: "Documentation Fee", quantity: 1, unitRate: 40000, amount: 40000, taxRate: 0, sortOrder: 2 },
        ],
      },
    },
  });
  const inv6 = await prisma.invoice.create({
    data: {
      invoiceNumber: "INV-2025-0006",
      shipmentId: shipment3.id,
      companyId: alHaram.id,
      createdById: accountsManager.id,
      status: "DRAFT",
      issueDate: new Date("2025-02-12"),
      dueDate: new Date("2025-03-14"),
      currency: "PKR",
      subtotal: 165000,
      taxRate: 0,
      taxAmount: 0,
      withholdingTax: 0,
      totalAmount: 165000,
      paidAmount: 0,
      balanceAmount: 165000,
      lineItems: {
        create: [
          { description: "Export Documentation & Clearance - Karachi Port", quantity: 1, unitRate: 95000, amount: 95000, taxRate: 0, sortOrder: 1 },
          { description: "Port Handling Fee", quantity: 1, unitRate: 45000, amount: 45000, taxRate: 0, sortOrder: 2 },
          { description: "Inspection & Certification", quantity: 1, unitRate: 25000, amount: 25000, taxRate: 0, sortOrder: 3 },
        ],
      },
    },
  });
  const inv7 = await prisma.invoice.create({
    data: {
      invoiceNumber: "INV-2024-0042",
      shipmentId: shipment5.id,
      companyId: tradeConsultants.id,
      createdById: accountsManager.id,
      status: "PAID",
      issueDate: new Date("2024-11-05"),
      dueDate: new Date("2024-11-12"),
      currency: "PKR",
      subtotal: 85000,
      taxRate: 0,
      taxAmount: 0,
      withholdingTax: 0,
      totalAmount: 85000,
      paidAmount: 85000,
      balanceAmount: 0,
      sentAt: new Date("2024-11-06"),
      lineItems: {
        create: [
          { description: "Export Consultancy & Documentation", quantity: 1, unitRate: 85000, amount: 85000, taxRate: 0, sortOrder: 1 },
        ],
      },
    },
  });
  const inv8 = await prisma.invoice.create({
    data: {
      invoiceNumber: "INV-2024-0043",
      shipmentId: shipment5.id,
      companyId: alHaram.id,
      createdById: accountsManager.id,
      status: "PAID",
      issueDate: new Date("2024-11-10"),
      dueDate: new Date("2024-11-25"),
      currency: "PKR",
      subtotal: 195000,
      taxRate: 0,
      taxAmount: 0,
      withholdingTax: 0,
      totalAmount: 195000,
      paidAmount: 195000,
      balanceAmount: 0,
      sentAt: new Date("2024-11-11"),
      lineItems: {
        create: [
          { description: "Port Clearance - Karachi Port", quantity: 1, unitRate: 120000, amount: 120000, taxRate: 0, sortOrder: 1 },
          { description: "Documentation Fee", quantity: 1, unitRate: 75000, amount: 75000, taxRate: 0, sortOrder: 2 },
        ],
      },
    },
  });
  const inv9 = await prisma.invoice.create({
    data: {
      invoiceNumber: "INV-2024-0044",
      shipmentId: shipment5.id,
      companyId: pacificFreight.id,
      createdById: accountsManager.id,
      status: "PAID",
      issueDate: new Date("2024-11-16"),
      dueDate: new Date("2024-12-01"),
      currency: "PKR",
      subtotal: 380000,
      taxRate: 0,
      taxAmount: 0,
      withholdingTax: 0,
      totalAmount: 380000,
      paidAmount: 380000,
      balanceAmount: 0,
      sentAt: new Date("2024-11-17"),
      lineItems: {
        create: [
          { description: "Freight Karachi to Jeddah", quantity: 1, unitRate: 280000, amount: 280000, taxRate: 0, sortOrder: 1 },
          { description: "Port Handling (Origin)", quantity: 1, unitRate: 55000, amount: 55000, taxRate: 0, sortOrder: 2 },
          { description: "Insurance & Documentation", quantity: 1, unitRate: 45000, amount: 45000, taxRate: 0, sortOrder: 3 },
        ],
      },
    },
  });
  console.log("Created 9 invoices with line items");

  // 5. Payments (various methods: BANK_TRANSFER, CHEQUE, CASH, ONLINE)
  await prisma.payment.create({
    data: { invoiceId: inv1.id, companyId: alHaram.id, shipmentId: shipment1.id, recordedById: accountsManager.id, amount: 185000, currency: "PKR", paymentDate: new Date("2025-02-01"), method: "BANK_TRANSFER", referenceNumber: "HBL-2025-001", bankName: "HBL", isAdvance: false },
  });
  await prisma.payment.create({
    data: { invoiceId: inv2.id, companyId: superiorWarehousing.id, shipmentId: shipment1.id, recordedById: accountsManager.id, amount: 95000, currency: "PKR", paymentDate: new Date("2025-02-10"), method: "CHEQUE", referenceNumber: "CHQ-5521", bankName: "ABL", isAdvance: false },
  });
  await prisma.payment.create({
    data: { invoiceId: inv3.id, companyId: fastFreight.id, shipmentId: shipment1.id, recordedById: accountsManager.id, amount: 100000, currency: "PKR", paymentDate: new Date("2025-02-05"), method: "CASH", isAdvance: false },
  });
  await prisma.payment.create({
    data: { invoiceId: inv4.id, companyId: pacificFreight.id, shipmentId: shipment2.id, recordedById: accountsManager.id, amount: 420000, currency: "PKR", paymentDate: new Date("2025-02-15"), method: "BANK_TRANSFER", referenceNumber: "MCB-2025-089", bankName: "MCB", isAdvance: false },
  });
  await prisma.payment.create({
    data: { invoiceId: inv7.id, companyId: tradeConsultants.id, shipmentId: shipment5.id, recordedById: accountsManager.id, amount: 85000, currency: "PKR", paymentDate: new Date("2024-11-08"), method: "ONLINE", referenceNumber: "IBFT-441122", isAdvance: false },
  });
  await prisma.payment.create({
    data: { invoiceId: inv8.id, companyId: alHaram.id, shipmentId: shipment5.id, recordedById: accountsManager.id, amount: 195000, currency: "PKR", paymentDate: new Date("2024-11-20"), method: "BANK_TRANSFER", referenceNumber: "HBL-2024-556", bankName: "HBL", isAdvance: false },
  });
  await prisma.payment.create({
    data: { invoiceId: inv9.id, companyId: pacificFreight.id, shipmentId: shipment5.id, recordedById: accountsManager.id, amount: 380000, currency: "PKR", paymentDate: new Date("2024-11-25"), method: "CHEQUE", referenceNumber: "CHQ-3300", bankName: "MCB", isAdvance: false },
  });
  console.log("Created 7 payments");

  console.log("Seed completed successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
