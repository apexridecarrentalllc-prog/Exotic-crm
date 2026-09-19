import React from "react";
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";

const GREEN = "#3F730A";
const WHITE = "#FFFFFF";
const MUTED = "#4B6B38";
const LINE = "#C5D9B4";

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 48,
    paddingHorizontal: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: GREEN,
  },
  topBar: {
    height: 4,
    backgroundColor: GREEN,
    marginBottom: 20,
    marginHorizontal: -40,
    marginTop: -36,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 22,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: LINE,
  },
  logo: {
    width: 180,
    height: 64,
    objectFit: "contain",
  },
  logoFallback: {
    width: 180,
    justifyContent: "center",
  },
  brandName: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: GREEN,
    letterSpacing: 1.5,
  },
  brandSub: {
    fontSize: 8,
    color: GREEN,
    marginTop: 4,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  invoiceMeta: {
    alignItems: "flex-end",
  },
  invoiceTitle: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: GREEN,
    letterSpacing: 2,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: "row",
    marginBottom: 3,
  },
  metaLabel: {
    width: 70,
    color: MUTED,
    textAlign: "right",
    marginRight: 8,
  },
  metaValue: {
    fontFamily: "Helvetica-Bold",
  },
  twoCol: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 20,
  },
  col: {
    flex: 1,
  },
  sectionLabel: {
    fontSize: 8,
    color: GREEN,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 6,
    fontFamily: "Helvetica-Bold",
  },
  billToBox: {
    padding: 10,
    backgroundColor: "#F4F8F0",
    borderWidth: 1,
    borderColor: LINE,
    borderLeftWidth: 3,
    borderLeftColor: GREEN,
  },
  companyName: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
  },
  address: {
    color: MUTED,
    lineHeight: 1.4,
  },
  shipmentBox: {
    padding: 10,
    borderWidth: 1,
    borderColor: GREEN,
    backgroundColor: WHITE,
  },
  shipmentValue: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
  },
  table: {
    marginTop: 4,
    marginBottom: 12,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: GREEN,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  tableHeaderText: {
    color: WHITE,
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: LINE,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  tableRowAlt: {
    backgroundColor: "#F4F8F0",
  },
  colDesc: { width: "46%" },
  colQty: { width: "14%", textAlign: "right" },
  colRate: { width: "20%", textAlign: "right" },
  colAmount: { width: "20%", textAlign: "right" },
  totalsWrap: {
    marginTop: 8,
    alignItems: "flex-end",
  },
  totalsBox: {
    width: 240,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
    color: MUTED,
  },
  grandTotalBox: {
    marginTop: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: GREEN,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  grandLabel: {
    color: WHITE,
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  grandValue: {
    color: WHITE,
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
  },
  paymentSection: {
    marginTop: 28,
    padding: 12,
    borderWidth: 1,
    borderColor: GREEN,
    backgroundColor: WHITE,
  },
  paymentTitle: {
    fontFamily: "Helvetica-Bold",
    marginBottom: 6,
    fontSize: 9,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: GREEN,
  },
  bankLine: {
    marginBottom: 4,
    color: MUTED,
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: LINE,
    paddingTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: MUTED,
  },
  watermark: {
    position: "absolute",
    top: "38%",
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    transform: "rotate(-28deg)",
  },
  watermarkPaid: {
    fontSize: 54,
    fontFamily: "Helvetica-Bold",
    color: "#059669",
    opacity: 0.28,
  },
  watermarkOverdue: {
    fontSize: 54,
    fontFamily: "Helvetica-Bold",
    color: "#DC2626",
    opacity: 0.28,
  },
});

export interface InvoicePDFData {
  invoiceNumber: string;
  issueDate: string;
  dueDate?: string;
  currency?: string;
  subtotal: number;
  taxRate?: number;
  taxAmount?: number;
  withholdingTax?: number;
  totalAmount: number;
  paidAmount?: number;
  balanceAmount?: number;
  status?: string;
  notes?: string | null;
  company: {
    name: string;
    address?: string | null;
    city?: string | null;
    country?: string | null;
  };
  shipment?: {
    referenceNumber: string;
  } | null;
  lineItems: Array<{
    description: string;
    quantity: number;
    unitRate: number;
    amount: number;
    taxRate?: number;
  }>;
  bankAccounts?: Array<{
    bankName: string;
    accountNumber: string;
    iban?: string | null;
    branchName?: string | null;
  }>;
  termsAndConditions?: string | null;
  generatedAt?: string;
  issuerCompanyName?: string | null;
  issuerTagline?: string | null;
  issuerLogoUrl?: string | null;
}

const DEFAULT_HEADER_NAME = process.env.NEXT_PUBLIC_COMPANY_NAME ?? "EXOTIC";
const DEFAULT_HEADER_LINE2 = process.env.NEXT_PUBLIC_COMPANY_TAGLINE ?? "LOGISTICS";
const DEFAULT_TERMS =
  process.env.NEXT_PUBLIC_INVOICE_TERMS ??
  "This is a computer-generated invoice. Please include the invoice number on your payment.";

function formatMoney(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function InvoicePDF({ invoice }: { invoice: InvoicePDFData }) {
  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  const status = (invoice.status ?? "").toUpperCase();
  const showPaidWatermark = status === "PAID";
  const showOverdueWatermark = status === "OVERDUE";
  const terms = invoice.termsAndConditions ?? DEFAULT_TERMS;
  const generatedAt = invoice.generatedAt ?? new Date().toISOString();
  const companyHeaderName = invoice.issuerCompanyName ?? DEFAULT_HEADER_NAME;
  const companyHeaderLine2 = invoice.issuerTagline ?? DEFAULT_HEADER_LINE2;
  const logoUrl = invoice.issuerLogoUrl;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.topBar} />

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

        <View style={styles.header}>
          {logoUrl ? (
            <Image src={logoUrl} style={styles.logo} />
          ) : (
            <View style={styles.logoFallback}>
              <Text style={styles.brandName}>{companyHeaderName}</Text>
              <Text style={styles.brandSub}>{companyHeaderLine2}</Text>
            </View>
          )}
          <View style={styles.invoiceMeta}>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Number</Text>
              <Text style={styles.metaValue}>{invoice.invoiceNumber}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Date</Text>
              <Text style={styles.metaValue}>{formatDate(invoice.issueDate)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.twoCol}>
          <View style={styles.col}>
            <Text style={styles.sectionLabel}>Bill to</Text>
            <View style={styles.billToBox}>
              <Text style={styles.companyName}>{invoice.company.name}</Text>
              {(invoice.company.address || invoice.company.city || invoice.company.country) && (
                <Text style={styles.address}>
                  {[invoice.company.address, invoice.company.city, invoice.company.country]
                    .filter(Boolean)
                    .join(", ")}
                </Text>
              )}
            </View>
          </View>
          {invoice.shipment && (
            <View style={styles.col}>
              <Text style={styles.sectionLabel}>Shipment</Text>
              <View style={styles.shipmentBox}>
                <Text style={styles.shipmentValue}>{invoice.shipment.referenceNumber}</Text>
              </View>
            </View>
          )}
        </View>

        <Text style={styles.sectionLabel}>Charges</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.colDesc, styles.tableHeaderText]}>Description</Text>
            <Text style={[styles.colQty, styles.tableHeaderText]}>Qty</Text>
            <Text style={[styles.colRate, styles.tableHeaderText]}>Rate</Text>
            <Text style={[styles.colAmount, styles.tableHeaderText]}>Amount</Text>
          </View>
          {invoice.lineItems.map((line, i) => (
            <View
              key={i}
              style={[styles.tableRow, ...(i % 2 === 1 ? [styles.tableRowAlt] : [])]}
            >
              <Text style={styles.colDesc}>{line.description}</Text>
              <Text style={styles.colQty}>{line.quantity}</Text>
              <Text style={styles.colRate}>{formatMoney(line.unitRate)}</Text>
              <Text style={styles.colAmount}>{formatMoney(line.amount)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totalsWrap}>
          <View style={styles.totalsBox}>
            <View style={styles.grandTotalBox}>
              <Text style={styles.grandLabel}>Total</Text>
              <Text style={styles.grandValue}>{formatMoney(invoice.totalAmount)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.paymentSection}>
          <Text style={styles.paymentTitle}>Payment details</Text>
          {invoice.bankAccounts && invoice.bankAccounts.length > 0 ? (
            invoice.bankAccounts.map((bank, i) => (
              <View key={i} style={styles.bankLine}>
                <Text>
                  <Text style={{ fontFamily: "Helvetica-Bold", color: GREEN }}>{bank.bankName}</Text>
                  {"  "}Account {bank.accountNumber}
                </Text>
                {bank.iban && <Text>IBAN: {bank.iban}</Text>}
                {bank.branchName && <Text>Branch: {bank.branchName}</Text>}
              </View>
            ))
          ) : (
            <Text style={styles.bankLine}>Bank details will be provided separately.</Text>
          )}
        </View>

        <View style={styles.footer} fixed>
          <Text>{terms}</Text>
          <Text>
            {new Date(generatedAt).toLocaleDateString("en-GB", { dateStyle: "short" })} · {companyHeaderName}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
