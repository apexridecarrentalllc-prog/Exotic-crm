import React from "react";
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    position: "relative",
  },
  logoPlaceholder: {
    width: 120,
    height: 48,
    backgroundColor: "#E5E7EB",
    marginBottom: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  logoPlaceholderText: {
    fontSize: 8,
    color: "#9CA3AF",
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    paddingBottom: 12,
  },
  invoiceTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  companyName: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 9,
    color: "#666",
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 6,
    color: "#374151",
  },
  billToBox: {
    padding: 10,
    borderWidth: 0.5,
    borderColor: "#d1d5db",
    backgroundColor: "#f9fafb",
  },
  row: {
    flexDirection: "row",
    marginBottom: 4,
  },
  label: {
    width: 100,
    color: "#555",
  },
  value: {
    flex: 1,
  },
  shipmentRefBox: {
    padding: 8,
    borderWidth: 1,
    borderColor: "#3F730A",
    backgroundColor: "#E8F0E0",
    marginTop: 6,
  },
  shipmentRefLabel: {
    fontSize: 8,
    color: "#3F730A",
    marginBottom: 2,
  },
  table: {
    marginTop: 8,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#3F730A",
    paddingVertical: 6,
    paddingHorizontal: 4,
    fontWeight: "bold",
  },
  tableHeaderText: {
    color: "#FFFFFF",
    fontSize: 9,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e5e7eb",
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  tableRowAlt: {
    backgroundColor: "#f3f4f6",
  },
  colDesc: { width: "35%" },
  colQty: { width: "12%", textAlign: "right" },
  colRate: { width: "18%", textAlign: "right" },
  colAmount: { width: "18%", textAlign: "right" },
  colTax: { width: "17%", textAlign: "right" },
  totalsWrap: {
    marginTop: 16,
    alignItems: "flex-end",
  },
  totalsBox: {
    width: 240,
    borderWidth: 0.5,
    borderColor: "#d1d5db",
    padding: 12,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  totalLabel: {
    color: "#555",
  },
  totalValue: {
    fontWeight: "bold",
  },
  grandTotalBox: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 2,
    borderTopColor: "#3F730A",
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 12,
    fontWeight: "bold",
  },
  paymentSection: {
    marginTop: 24,
    padding: 12,
    backgroundColor: "#f5f5f5",
    fontSize: 9,
    borderWidth: 0.5,
    borderColor: "#e5e7eb",
  },
  paymentTitle: {
    fontWeight: "bold",
    marginBottom: 6,
  },
  bankLine: {
    marginBottom: 4,
  },
  footer: {
    position: "absolute",
    bottom: 28,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: "#6b7280",
  },
  watermark: {
    position: "absolute",
    top: "30%",
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    transform: "rotate(-30deg)",
  },
  watermarkPaid: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#059669",
    opacity: 0.35,
  },
  watermarkOverdue: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#DC2626",
    opacity: 0.35,
  },
  taxIds: {
    marginTop: 4,
    fontSize: 9,
    color: "#555",
  },
});

export interface InvoicePDFData {
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  withholdingTax: number;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  status?: string;
  notes?: string | null;
  company: {
    name: string;
    address?: string | null;
    city?: string | null;
    country?: string | null;
    taxNumber?: string | null;
    ntn?: string | null;
    strn?: string | null;
  };
  shipment?: {
    referenceNumber: string;
  } | null;
  lineItems: Array<{
    description: string;
    quantity: number;
    unitRate: number;
    amount: number;
    taxRate: number;
  }>;
  bankAccounts?: Array<{
    bankName: string;
    accountNumber: string;
    iban?: string | null;
    branchName?: string | null;
  }>;
  termsAndConditions?: string | null;
  generatedAt?: string;
  /** From settings: issuer company name (header) */
  issuerCompanyName?: string | null;
  /** From settings: issuer tagline */
  issuerTagline?: string | null;
  /** From settings: logo URL path */
  issuerLogoUrl?: string | null;
}

const DEFAULT_HEADER_NAME = process.env.NEXT_PUBLIC_COMPANY_NAME ?? "IE Manager";
const DEFAULT_HEADER_LINE2 = process.env.NEXT_PUBLIC_COMPANY_TAGLINE ?? "Import / Export Management";
const DEFAULT_TERMS =
  process.env.NEXT_PUBLIC_INVOICE_TERMS ??
  "Payment is due by the due date. Terms and conditions apply as per agreement. This is a computer-generated invoice.";

export function InvoicePDF({ invoice }: { invoice: InvoicePDFData }) {
  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString(undefined, { dateStyle: "medium" });
  const formatMoney = (n: number) =>
    invoice.currency + " " + n.toLocaleString("en-US", { minimumFractionDigits: 2 });

  const status = (invoice.status ?? "").toUpperCase();
  const showPaidWatermark = status === "PAID";
  const showOverdueWatermark = status === "OVERDUE";
  const terms = invoice.termsAndConditions ?? DEFAULT_TERMS;
  const generatedAt = invoice.generatedAt ?? new Date().toISOString();
  const ntn = invoice.company.ntn ?? invoice.company.taxNumber;
  const strn = invoice.company.strn;
  const companyHeaderName = invoice.issuerCompanyName ?? DEFAULT_HEADER_NAME;
  const companyHeaderLine2 = invoice.issuerTagline ?? DEFAULT_HEADER_LINE2;
  const logoUrl = invoice.issuerLogoUrl;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {showPaidWatermark && (
          <View style={styles.watermark}>
            <Text style={styles.watermarkPaid}>PAID</Text>
          </View>
        )}
        {showOverdueWatermark && !showPaidWatermark && (
          <View style={styles.watermark}>
            <Text style={styles.watermarkOverdue}>OVERDUE</Text>
          </View>
        )}

        {logoUrl ? (
          <View style={{ marginBottom: 16 }}>
            <Image src={logoUrl} style={{ width: 120, height: 48 }} />
          </View>
        ) : (
          <View style={styles.logoPlaceholder}>
            <Text style={styles.logoPlaceholderText}>Company logo</Text>
          </View>
        )}

        <View style={styles.header}>
          <Text style={styles.invoiceTitle}>INVOICE</Text>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.companyName}>{companyHeaderName}</Text>
              <Text style={styles.subtitle}>{companyHeaderLine2}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <View style={styles.row}><Text style={styles.label}>Invoice #</Text><Text style={styles.value}>{invoice.invoiceNumber}</Text></View>
              <View style={styles.row}><Text style={styles.label}>Issue date</Text><Text style={styles.value}>{formatDate(invoice.issueDate)}</Text></View>
              <View style={styles.row}><Text style={styles.label}>Due date</Text><Text style={styles.value}>{formatDate(invoice.dueDate)}</Text></View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bill To</Text>
          <View style={styles.billToBox}>
            <Text style={{ fontWeight: "bold", marginBottom: 4 }}>{invoice.company.name}</Text>
            {(invoice.company.address || invoice.company.city || invoice.company.country) && (
              <Text style={{ marginBottom: 2, color: "#555" }}>
                {[invoice.company.address, invoice.company.city, invoice.company.country]
                  .filter(Boolean)
                  .join(", ")}
              </Text>
            )}
            {(ntn || strn) && (
              <View style={styles.taxIds}>
                {ntn && <Text>NTN: {ntn}</Text>}
                {strn && <Text>STRN: {strn}</Text>}
              </View>
            )}
          </View>
        </View>

        {invoice.shipment && (
          <View style={styles.section}>
            <View style={styles.shipmentRefBox}>
              <Text style={styles.shipmentRefLabel}>Shipment reference</Text>
              <Text style={{ fontWeight: "bold" }}>{invoice.shipment.referenceNumber}</Text>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Line items</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.colDesc, styles.tableHeaderText]}>Description</Text>
              <Text style={[styles.colQty, styles.tableHeaderText]}>Qty</Text>
              <Text style={[styles.colRate, styles.tableHeaderText]}>Unit rate</Text>
              <Text style={[styles.colAmount, styles.tableHeaderText]}>Amount</Text>
              <Text style={[styles.colTax, styles.tableHeaderText]}>Tax %</Text>
            </View>
            {invoice.lineItems.map((line, i) => (
              <View
                key={i}
                style={[
                  styles.tableRow,
                  ...(i % 2 === 1 ? [styles.tableRowAlt] : []),
                ]}
              >
                <Text style={styles.colDesc}>{line.description}</Text>
                <Text style={styles.colQty}>{line.quantity}</Text>
                <Text style={styles.colRate}>{formatMoney(line.unitRate)}</Text>
                <Text style={styles.colAmount}>{formatMoney(line.amount)}</Text>
                <Text style={styles.colTax}>{line.taxRate}%</Text>
              </View>
            ))}
          </View>

          <View style={styles.totalsWrap}>
            <View style={styles.totalsBox}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Subtotal</Text>
                <Text style={styles.totalValue}>{formatMoney(invoice.subtotal)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Tax ({invoice.taxRate}%)</Text>
                <Text style={styles.totalValue}>{formatMoney(invoice.taxAmount)}</Text>
              </View>
              {invoice.withholdingTax > 0 && (
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Withholding tax</Text>
                  <Text style={styles.totalValue}>-{formatMoney(invoice.withholdingTax)}</Text>
                </View>
              )}
              <View style={styles.grandTotalBox}>
                <Text>Grand total</Text>
                <Text>{formatMoney(invoice.totalAmount)}</Text>
              </View>
            </View>
          </View>
        </View>

        {invoice.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.value}>{invoice.notes}</Text>
          </View>
        )}

        <View style={styles.paymentSection}>
          <Text style={styles.paymentTitle}>Payment details</Text>
          <Text style={{ marginBottom: 6 }}>
            Please remit payment by the due date. Include invoice number on your payment.
          </Text>
          {invoice.bankAccounts && invoice.bankAccounts.length > 0 ? (
            invoice.bankAccounts.map((bank, i) => (
              <View key={i} style={styles.bankLine}>
                <Text><Text style={{ fontWeight: "bold" }}>{bank.bankName}</Text> – Account: {bank.accountNumber}</Text>
                {bank.iban && <Text>IBAN: {bank.iban}</Text>}
                {bank.branchName && <Text>Branch: {bank.branchName}</Text>}
              </View>
            ))
          ) : (
            <Text>Bank details will be provided separately.</Text>
          )}
        </View>

        <View style={styles.footer} fixed>
          <Text>{terms}</Text>
          <Text>Page 1 · Generated {new Date(generatedAt).toLocaleDateString(undefined, { dateStyle: "short" })} · {companyHeaderName}</Text>
        </View>
      </Page>
    </Document>
  );
}
