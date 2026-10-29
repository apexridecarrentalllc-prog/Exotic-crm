import React from "react";
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
  Svg,
  Path,
  Rect,
  Circle,
} from "@react-pdf/renderer";
import { amountInWords } from "@/lib/number-to-words";

// The original invoice colour scheme.
const GREEN = "#3F730A"; // headings, main text, table header, total bar
const MUTED = "#4B6B38"; // secondary text
const SOFT = "#F4F8F0"; // light card background
const LINE = "#C5D9B4"; // hairlines and borders
const WHITE = "#FFFFFF";

const styles = StyleSheet.create({
  page: {
    paddingTop: 34,
    // Leaves room for the footer (contact details + date line) so content never runs under it.
    paddingBottom: 118,
    paddingHorizontal: 40,
    fontSize: 9.5,
    fontFamily: "Helvetica",
    color: GREEN,
  },
  topBar: {
    height: 4,
    backgroundColor: GREEN,
    marginBottom: 22,
    marginHorizontal: -40,
    marginTop: -34,
  },

  // ---- header ----
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 22,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: LINE,
  },
  logo: {
    width: 180,
    height: 81,
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
    color: MUTED,
    marginTop: 4,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  invoiceMeta: {
    alignItems: "flex-end",
  },
  invoiceTitle: {
    fontSize: 24,
    fontFamily: "Helvetica-Bold",
    color: GREEN,
    letterSpacing: 3,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  metaLabel: {
    width: 56,
    fontSize: 8.5,
    color: MUTED,
    textAlign: "right",
    marginRight: 10,
  },
  metaValue: {
    fontFamily: "Helvetica-Bold",
    color: GREEN,
  },
  statusPill: {
    marginTop: 8,
    paddingVertical: 3,
    paddingHorizontal: 9,
    borderRadius: 9,
  },
  statusText: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1,
  },

  // ---- bill to / shipment cards ----
  twoCol: {
    flexDirection: "row",
    marginBottom: 22,
  },
  col: {
    flex: 1,
    marginRight: 14,
  },
  colLast: {
    flex: 1,
  },
  sectionLabel: {
    fontSize: 7.5,
    color: GREEN,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 6,
    fontFamily: "Helvetica-Bold",
  },
  infoCard: {
    flexGrow: 1,
    padding: 11,
    backgroundColor: SOFT,
    borderWidth: 1,
    borderColor: LINE,
    borderLeftWidth: 3,
    borderLeftColor: GREEN,
    borderRadius: 3,
  },
  companyName: {
    fontSize: 11.5,
    fontFamily: "Helvetica-Bold",
    color: GREEN,
    marginBottom: 4,
  },
  address: {
    fontSize: 9,
    color: MUTED,
    lineHeight: 1.45,
  },
  shipmentValue: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11.5,
    color: GREEN,
  },

  // ---- charges table ----
  table: {
    marginTop: 2,
    marginBottom: 14,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: GREEN,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  tableHeaderText: {
    color: WHITE,
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.9,
    textTransform: "uppercase",
  },
  continuedRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    fontSize: 8,
    color: MUTED,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.75,
    borderBottomColor: LINE,
    paddingVertical: 9,
    paddingHorizontal: 10,
  },
  colDesc: { width: "46%", color: GREEN },
  colQty: { width: "12%", textAlign: "right", color: GREEN },
  colRate: { width: "20%", textAlign: "right", color: GREEN },
  colAmount: { width: "22%", textAlign: "right", color: GREEN, fontFamily: "Helvetica-Bold" },

  // ---- totals ----
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginTop: 6,
  },
  // Amount in words: a slim side bar like the other cards, as tall as the Total bar for one-line amounts,
  // with the text centred against it. The minimum is just under the bar's height (about 32.3pt) so this block
  // never makes the row taller than the Total box; longer amounts grow downwards from the top.
  wordsBlock: {
    flex: 1,
    marginRight: 26,
    minHeight: 32,
    justifyContent: "center",
    paddingLeft: 10,
    borderLeftWidth: 2,
    borderLeftColor: GREEN,
  },
  wordsCaption: {
    fontSize: 6.5,
    letterSpacing: 1.3,
    textTransform: "uppercase",
    color: MUTED,
    marginBottom: 3,
  },
  wordsText: {
    fontSize: 9.5,
    lineHeight: 1.35,
    fontFamily: "Helvetica-Bold",
    color: GREEN,
  },
  totalsBox: {
    width: 250,
  },
  grandTotalBox: {
    paddingVertical: 9,
    paddingHorizontal: 12,
    backgroundColor: GREEN,
    borderRadius: 3,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  grandLabel: {
    color: WHITE,
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  grandValue: {
    color: WHITE,
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
  },
  settleBox: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 0.75,
    borderTopColor: LINE,
  },
  settleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  settleLabel: {
    color: MUTED,
  },
  settleValue: {
    color: GREEN,
  },
  balanceLabel: {
    fontFamily: "Helvetica-Bold",
    color: GREEN,
  },
  balanceValue: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    color: GREEN,
  },

  // ---- bank details card ----
  paymentSection: {
    marginTop: 26,
    padding: 12,
    backgroundColor: SOFT,
    borderWidth: 1,
    borderColor: LINE,
    borderLeftWidth: 3,
    borderLeftColor: GREEN,
    borderRadius: 3,
  },
  bankHeading: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7.5,
    letterSpacing: 1.2,
    marginBottom: 7,
    color: GREEN,
  },
  bankHolder: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10.5,
    marginBottom: 6,
    color: GREEN,
  },
  bankRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  bankLabel: {
    color: MUTED,
    marginRight: 4,
  },
  bankValue: {
    color: GREEN,
  },
  bankFallback: {
    color: MUTED,
  },

  // ---- footer ----
  footer: {
    position: "absolute",
    bottom: 22,
    left: 40,
    right: 40,
    fontSize: 8,
    color: MUTED,
  },
  contactBand: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: SOFT,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 4,
    paddingVertical: 9,
    paddingHorizontal: 10,
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    flexBasis: 0,
    paddingRight: 8,
  },
  contactBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 7,
  },
  contactBody: {
    flex: 1,
  },
  contactCaption: {
    fontSize: 6.5,
    letterSpacing: 0.9,
    textTransform: "uppercase",
    color: MUTED,
    marginBottom: 1.5,
  },
  contactValue: {
    fontSize: 8.5,
    lineHeight: 1.35,
    color: GREEN,
  },
  footerMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginTop: 7,
    fontSize: 7.5,
    color: MUTED,
  },
  // Footer text (terms) gets all the width that is left, so long text wraps inside its own column
  // instead of running under the date.
  footerNote: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    paddingRight: 16,
  },
  footerNoteText: {
    // The size is set here as well, because the engine measures a line height against the text's own size.
    fontSize: 7.5,
    lineHeight: 1.4,
  },
  // Date, company name and page number. The page number comes from a render function, which the layout
  // cannot measure, so this block gets an explicit width (see stampWidth) and is right-aligned inside it.
  footerStamp: {
    flexShrink: 0,
  },
  footerStampText: {
    textAlign: "right",
  },
  footerMetaPlain: {
    marginTop: 0,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: LINE,
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
  /** False hides the whole bank box (Settings > Bank Details switch). Missing means shown. */
  showBankDetails?: boolean;
  /** Our own bank details (from Settings). Null or missing means "not set yet". */
  bankDetails?: {
    accountHolder: string;
    currency: string;
    accountNumber: string;
    iban: string;
    bankName: string;
    branch: string;
    swift: string;
  } | null;
  termsAndConditions?: string | null;
  generatedAt?: string;
  issuerCompanyName?: string | null;
  issuerTagline?: string | null;
  issuerLogoUrl?: string | null;
  /** Business address (the Address box only), from Settings. */
  issuerAddress?: string | null;
  /** Business email address, from Settings. */
  issuerEmail?: string | null;
  /** Business phone number, from Settings. */
  issuerPhone?: string | null;
}

const DEFAULT_HEADER_NAME = process.env.NEXT_PUBLIC_COMPANY_NAME ?? "EXOTIC";
const DEFAULT_HEADER_LINE2 = process.env.NEXT_PUBLIC_COMPANY_TAGLINE ?? "LOGISTICS";

/** Small status pill under the invoice date (replaces the old watermark that ran across the numbers). */
const STATUS_BADGES: Record<string, { label: string; color: string; background: string }> = {
  PAID: { label: "PAID", color: "#2F7D4F", background: "#E6F2EA" },
  OVERDUE: { label: "OVERDUE", color: "#B42318", background: "#FDEAE8" },
  PARTIALLY_PAID: { label: "PARTIALLY PAID", color: "#8A5A00", background: "#FFF4D6" },
  CANCELLED: { label: "CANCELLED", color: "#5B6070", background: "#ECEDF0" },
  DRAFT: { label: "DRAFT", color: "#5B6070", background: "#ECEDF0" },
};

const ICON_PROPS = {
  stroke: WHITE,
  strokeWidth: 2,
  fill: "none",
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

function MailIcon() {
  return (
    <Svg viewBox="0 0 24 24" width={9} height={9}>
      <Rect x={2} y={4} width={20} height={16} rx={2} {...ICON_PROPS} />
      <Path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" {...ICON_PROPS} />
    </Svg>
  );
}

function LocationIcon() {
  return (
    <Svg viewBox="0 0 24 24" width={9} height={9}>
      <Path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" {...ICON_PROPS} />
      <Circle cx={12} cy={10} r={3} {...ICON_PROPS} />
    </Svg>
  );
}

function PhoneIcon() {
  return (
    <Svg viewBox="0 0 24 24" width={9} height={9}>
      <Path
        d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"
        {...ICON_PROPS}
      />
    </Svg>
  );
}

function TableHead() {
  return (
    <View style={styles.tableHeader}>
      <Text style={[styles.colDesc, styles.tableHeaderText]}>Description</Text>
      <Text style={[styles.colQty, styles.tableHeaderText]}>Qty</Text>
      <Text style={[styles.colRate, styles.tableHeaderText]}>Rate (AED)</Text>
      <Text style={[styles.colAmount, styles.tableHeaderText]}>Amount (AED)</Text>
    </View>
  );
}

/**
 * Column width follows the text length plus room for the icon badge and padding, so a short phone number
 * never wraps while a long address gets more space (and may wrap onto a second line).
 */
function contactWeight(text: string): number {
  return Math.min(235, 33 + text.length * 5);
}

/** Joins the last two words with a non-breaking space so a wrapped amount never leaves "Only" alone on a line. */
function keepLastWordsTogether(text: string): string {
  return text.replace(/ (\S+)$/, "\u00A0$1");
}

function formatMoney(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function InvoicePDF({ invoice }: { invoice: InvoicePDFData }) {
  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  const badge = STATUS_BADGES[(invoice.status ?? "").toUpperCase()];
  const terms = invoice.termsAndConditions?.trim() ?? "";
  const contactItems = [
    invoice.issuerEmail ? { key: "email", caption: "Email", icon: <MailIcon />, text: invoice.issuerEmail } : null,
    invoice.issuerAddress ? { key: "address", caption: "Address", icon: <LocationIcon />, text: invoice.issuerAddress } : null,
    invoice.issuerPhone ? { key: "phone", caption: "Phone", icon: <PhoneIcon />, text: invoice.issuerPhone } : null,
  ].filter((item): item is { key: string; caption: string; icon: React.ReactElement; text: string } => item !== null);
  const generatedAt = invoice.generatedAt ?? new Date().toISOString();
  const companyHeaderName = invoice.issuerCompanyName ?? DEFAULT_HEADER_NAME;
  const companyHeaderLine2 = invoice.issuerTagline ?? DEFAULT_HEADER_LINE2;
  const logoUrl = invoice.issuerLogoUrl;

  const paid = invoice.paidAmount ?? 0;
  const balance = invoice.balanceAmount ?? invoice.totalAmount - paid;

  // Room for "dd/mm/yyyy · NAME · Page 10 of 10" at 7.5pt (about 4.3pt per character), so it never wraps or collides.
  const stampWidth = Math.min(300, Math.max(120, Math.round((30 + companyHeaderName.length) * 4.3)));

  const bank = invoice.bankDetails;
  const currencyPrefix = bank?.currency ? `${bank.currency} ` : "";
  const bankRows = bank
    ? [
        bank.accountNumber && { label: `${currencyPrefix}A/C NO:`, value: bank.accountNumber },
        bank.iban && { label: `${currencyPrefix}IBAN NO:`, value: bank.iban },
        bank.bankName && { label: "BANK NAME:", value: bank.bankName },
        bank.branch && { label: "BRANCH ADDRESS:", value: bank.branch },
        bank.swift && { label: "SWIFT CODE:", value: bank.swift },
      ].filter((row): row is { label: string; value: string } => Boolean(row))
    : [];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.topBar} />

        {/* On pages after the first: which invoice this is, and the table column headings again. */}
        <View
          fixed
          render={({ pageNumber }) =>
            pageNumber > 1 ? (
              <View>
                <View style={styles.continuedRow}>
                  <Text>Invoice {invoice.invoiceNumber} (continued)</Text>
                  <Text>{invoice.company.name}</Text>
                </View>
                <TableHead />
              </View>
            ) : null
          }
        />

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
            {badge ? (
              <View style={[styles.statusPill, { backgroundColor: badge.background }]}>
                <Text style={[styles.statusText, { color: badge.color }]}>{badge.label}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.twoCol}>
          <View style={invoice.shipment ? styles.col : styles.colLast}>
            <Text style={styles.sectionLabel}>Bill to</Text>
            <View style={styles.infoCard}>
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
            <View style={styles.colLast}>
              <Text style={styles.sectionLabel}>Shipment</Text>
              <View style={styles.infoCard}>
                <Text style={styles.shipmentValue}>{invoice.shipment.referenceNumber}</Text>
              </View>
            </View>
          )}
        </View>

        <Text style={styles.sectionLabel}>Charges</Text>
        <View style={styles.table}>
          <TableHead />
          {invoice.lineItems.map((line, i) => (
            <View key={i} style={styles.tableRow} wrap={false}>
              <Text style={styles.colDesc}>{line.description}</Text>
              <Text style={styles.colQty}>{line.quantity}</Text>
              <Text style={styles.colRate}>{formatMoney(line.unitRate)}</Text>
              <Text style={styles.colAmount}>{formatMoney(line.amount)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totalsRow} wrap={false}>
          <View style={styles.wordsBlock}>
            <Text style={styles.wordsCaption}>Amount in words</Text>
            <Text style={styles.wordsText}>{keepLastWordsTogether(`${amountInWords(invoice.totalAmount, "AED")} Only`)}</Text>
          </View>
          <View style={styles.totalsBox}>
            <View style={styles.grandTotalBox}>
              <Text style={styles.grandLabel}>Total</Text>
              <Text style={styles.grandValue}>AED {formatMoney(invoice.totalAmount)}</Text>
            </View>
            {paid > 0 ? (
              <View style={styles.settleBox}>
                <View style={styles.settleRow}>
                  <Text style={styles.settleLabel}>Amount paid</Text>
                  <Text style={styles.settleValue}>AED {formatMoney(paid)}</Text>
                </View>
                <View style={styles.settleRow}>
                  <Text style={styles.balanceLabel}>Balance due</Text>
                  <Text style={styles.balanceValue}>AED {formatMoney(Math.max(0, balance))}</Text>
                </View>
              </View>
            ) : null}
          </View>
        </View>

        {invoice.showBankDetails !== false ? (
          <View style={styles.paymentSection} wrap={false}>
            {bank ? (
              <View>
                <Text style={styles.bankHeading}>BANK DETAILS</Text>
                {bank.accountHolder ? <Text style={styles.bankHolder}>{bank.accountHolder}</Text> : null}
                {bankRows.map((row, i) => (
                  <View key={i} style={styles.bankRow}>
                    <Text style={styles.bankLabel}>{row.label}</Text>
                    <Text style={styles.bankValue}>{row.value}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.bankFallback}>Bank details will be provided separately.</Text>
            )}
          </View>
        ) : null}

        <View style={styles.footer} fixed>
          {contactItems.length > 0 ? (
            <View style={styles.contactBand}>
              {contactItems.map((item) => (
                <View key={item.key} style={[styles.contactItem, { flexGrow: contactWeight(item.text) }]}>
                  <View style={styles.contactBadge}>{item.icon}</View>
                  <View style={styles.contactBody}>
                    <Text style={styles.contactCaption}>{item.caption}</Text>
                    <Text style={styles.contactValue}>{item.text}</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : null}
          <View style={contactItems.length > 0 ? styles.footerMeta : [styles.footerMeta, styles.footerMetaPlain]}>
            {/* Left column stays empty unless footer text is saved in Settings; the date, name and page stay on the right. */}
            <View style={styles.footerNote}>{terms ? <Text style={styles.footerNoteText}>{terms}</Text> : null}</View>
            <View style={[styles.footerStamp, { width: stampWidth }]}>
            <Text
              style={styles.footerStampText}
              render={({ pageNumber, totalPages }) => {
                const base = `${new Date(generatedAt).toLocaleDateString("en-GB", { dateStyle: "short" })} · ${companyHeaderName}`;
                return totalPages > 1 ? `${base} · Page ${pageNumber} of ${totalPages}` : base;
              }}
            />
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}
