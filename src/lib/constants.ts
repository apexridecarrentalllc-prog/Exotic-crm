/** Company type enum values and display labels */
export const COMPANY_TYPES = [
  { value: "CLEARING_AGENT", label: "Clearing Agent" },
  { value: "TRANSPORTER", label: "Transporter" },
  { value: "WAREHOUSE", label: "Warehouse" },
  { value: "CONSULTANT", label: "Consultant" },
  { value: "FREIGHT_FORWARDER", label: "Freight Forwarder" },
  { value: "CUSTOMS_AGENT", label: "Customs Agent" },
  { value: "OTHER", label: "Other" },
] as const;

/** Payment terms for company form */
export const PAYMENT_TERMS = [
  { value: "Advance", label: "Advance" },
  { value: "Net 7", label: "Net 7" },
  { value: "Net 15", label: "Net 15" },
  { value: "Net 30", label: "Net 30" },
  { value: "Net 45", label: "Net 45" },
  { value: "Net 60", label: "Net 60" },
  { value: "Custom", label: "Custom" },
] as const;

/** Default currencies */
export const CURRENCIES = [
  { value: "PKR", label: "PKR" },
  { value: "USD", label: "USD" },
  { value: "EUR", label: "EUR" },
  { value: "GBP", label: "GBP" },
  { value: "AED", label: "AED" },
  { value: "SAR", label: "SAR" },
] as const;
