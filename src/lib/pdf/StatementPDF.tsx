import React from "react";
import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
} from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
  },
  header: {
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    paddingBottom: 12,
  },
  companyName: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 9,
    color: "#666",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 8,
  },
  period: {
    fontSize: 11,
    color: "#555",
    marginBottom: 16,
  },
  preparedFor: {
    marginBottom: 16,
    padding: 10,
    borderWidth: 0.5,
    borderColor: "#d1d5db",
    backgroundColor: "#f9fafb",
  },
  preparedForLabel: {
    fontSize: 9,
    color: "#6b7280",
    marginBottom: 4,
  },
  companyDetail: {
    fontWeight: "bold",
    marginBottom: 2,
  },
  addressLine: {
    color: "#555",
    marginBottom: 2,
  },
  openingBalance: {
    marginBottom: 16,
    padding: 8,
    backgroundColor: "#f3f4f6",
    flexDirection: "row",
    justifyContent: "space-between",
    fontWeight: "bold",
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
    paddingVertical: 5,
    paddingHorizontal: 4,
  },
  tableRowAlt: {
    backgroundColor: "#f9fafb",
  },
  colDate: { width: "14%" },
  colDesc: { width: "28%" },
  colRef: { width: "18%" },
  colDebit: { width: "13%", textAlign: "right" },
  colCredit: { width: "13%", textAlign: "right" },
  colBalance: { width: "14%", textAlign: "right", fontWeight: "bold" },
  closingBalance: {
    marginTop: 16,
    padding: 12,
    borderWidth: 2,
    borderColor: "#3F730A",
    backgroundColor: "#E8F0E0",
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 14,
    fontWeight: "bold",
  },
  footer: {
    position: "absolute",
    bottom: 28,
    left: 40,
    right: 40,
    fontSize: 8,
    color: "#6b7280",
    textAlign: "center",
  },
  footerNote: {
    marginTop: 4,
  },
});

export interface StatementPDFData {
  company: {
    name: string;
    address?: string | null;
    city?: string | null;
    country?: string | null;
    primaryContact?: {
      name?: string | null;
      email?: string | null;
      phone?: string | null;
    } | null;
  };
  fromDate: string | null;
  toDate: string | null;
  openingBalance: number;
  entries: Array<{
    date: string;
    description: string;
    reference: string;
    debit: number;
    credit: number;
    balance: number;
  }>;
  closingBalance: number;
  currency?: string;
  generatedAt?: string;
  contactNote?: string;
}

const COMPANY_HEADER_NAME = process.env.NEXT_PUBLIC_COMPANY_NAME ?? "IE Manager";
const COMPANY_HEADER_LINE2 = process.env.NEXT_PUBLIC_COMPANY_TAGLINE ?? "Import / Export Management";

export function StatementPDF({ statement }: { statement: StatementPDFData }) {
  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString(undefined, { dateStyle: "short" });
  const formatMoney = (n: number) =>
    (statement.currency ?? "PKR") + " " + n.toLocaleString("en-US", { minimumFractionDigits: 2 });

  const periodText =
    statement.fromDate && statement.toDate
      ? `${formatDate(statement.fromDate)} to ${formatDate(statement.toDate)}`
      : statement.fromDate
        ? `From ${formatDate(statement.fromDate)}`
        : statement.toDate
          ? `Through ${formatDate(statement.toDate)}`
          : "All time";

  const contact = statement.company.primaryContact;
  const contactLine = contact
    ? [contact.name, contact.email, contact.phone].filter(Boolean).join(" · ")
    : null;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.companyName}>{COMPANY_HEADER_NAME}</Text>
          <Text style={styles.subtitle}>{COMPANY_HEADER_LINE2}</Text>
        </View>

        <Text style={styles.title}>Statement of Account</Text>
        <Text style={styles.period}>Period: {periodText}</Text>

        <View style={styles.preparedFor}>
          <Text style={styles.preparedForLabel}>Prepared for</Text>
          <Text style={styles.companyDetail}>{statement.company.name}</Text>
          {(statement.company.address || statement.company.city || statement.company.country) && (
            <Text style={styles.addressLine}>
              {[statement.company.address, statement.company.city, statement.company.country]
                .filter(Boolean)
                .join(", ")}
            </Text>
          )}
          {contactLine && (
            <Text style={styles.addressLine}>{contactLine}</Text>
          )}
        </View>

        <View style={styles.openingBalance}>
          <Text>Opening balance</Text>
          <Text>{formatMoney(statement.openingBalance)}</Text>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.colDate, styles.tableHeaderText]}>Date</Text>
            <Text style={[styles.colDesc, styles.tableHeaderText]}>Description</Text>
            <Text style={[styles.colRef, styles.tableHeaderText]}>Reference</Text>
            <Text style={[styles.colDebit, styles.tableHeaderText]}>Debit</Text>
            <Text style={[styles.colCredit, styles.tableHeaderText]}>Credit</Text>
            <Text style={[styles.colBalance, styles.tableHeaderText]}>Balance</Text>
          </View>
          {statement.entries.map((row, i) => (
            <View
              key={i}
              style={[
                styles.tableRow,
                ...(i % 2 === 1 ? [styles.tableRowAlt] : []),
              ]}
            >
              <Text style={styles.colDate}>{row.date}</Text>
              <Text style={styles.colDesc}>{row.description}</Text>
              <Text style={styles.colRef}>{row.reference}</Text>
              <Text style={styles.colDebit}>{row.debit ? formatMoney(row.debit) : ""}</Text>
              <Text style={styles.colCredit}>{row.credit ? formatMoney(row.credit) : ""}</Text>
              <Text style={styles.colBalance}>{formatMoney(row.balance)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.closingBalance}>
          <Text>Closing balance</Text>
          <Text>{formatMoney(statement.closingBalance)}</Text>
        </View>

        <View style={styles.footer} fixed>
          <Text>
            {COMPANY_HEADER_NAME} · Statement generated {statement.generatedAt ? formatDate(statement.generatedAt) : formatDate(new Date().toISOString())}
          </Text>
          {(statement.contactNote || contactLine) && (
            <Text style={styles.footerNote}>
              {statement.contactNote ?? "For queries, please contact us using the details above."}
            </Text>
          )}
        </View>
      </Page>
    </Document>
  );
}
