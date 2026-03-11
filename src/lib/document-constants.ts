import type { DocumentType } from "@prisma/client";

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  BILL_OF_LADING: "Bill of Lading",
  PORT_CLEARANCE: "Port Clearance",
  CUSTOMS_DECLARATION: "Customs Declaration",
  DELIVERY_RECEIPT: "Delivery Receipt",
  INVOICE_COPY: "Commercial Invoice / Invoice Copy",
  TRANSPORT_DOC: "Transport Document",
  INSURANCE: "Insurance",
  OTHER: "Other",
};

/** Required document types per shipment type for checklist */
export const REQUIRED_DOCS_IMPORT: DocumentType[] = [
  "BILL_OF_LADING",
  "PORT_CLEARANCE",
  "CUSTOMS_DECLARATION",
  "DELIVERY_RECEIPT",
];

export const REQUIRED_DOCS_EXPORT: DocumentType[] = [
  "INVOICE_COPY", // Commercial Invoice
  "BILL_OF_LADING", // Bill of Lading / AWB
  "CUSTOMS_DECLARATION",
  "OTHER", // Packing List, Certificate of Origin - map as OTHER for now
];

export function getRequiredDocTypesForShipmentType(
  shipmentType: "IMPORT" | "EXPORT"
): DocumentType[] {
  return shipmentType === "IMPORT" ? REQUIRED_DOCS_IMPORT : REQUIRED_DOCS_EXPORT;
}
