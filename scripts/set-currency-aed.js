/**
 * Retags every stored currency to AED. Amounts are never touched; only the currency tag changes.
 *
 *   node scripts/set-currency-aed.js                       dry run: show what would change
 *   node scripts/set-currency-aed.js --apply               write the change (local database)
 *   node scripts/set-currency-aed.js --apply --allow-remote --confirm-db=<database name>
 *                                                          write the change to a remote database
 *   node scripts/set-currency-aed.js --restore=<file>      dry run of an undo from a backup file
 *   node scripts/set-currency-aed.js --restore=<file> --apply
 *
 * Safety:
 *  - Dry run by default.
 *  - Refuses a remote database unless --allow-remote is given, and for a remote write also
 *    requires --confirm-db=<the database name it prints>.
 *  - Before writing, saves every changed row's id and old currency to currency-backup-<time>.json.
 *  - After writing, checks that row counts and all amount totals are unchanged.
 *  - Safe to run twice: rows already in AED are not touched.
 */
const fs = require("fs");
const { PrismaClient } = require("@prisma/client");

const args = process.argv.slice(2);
const hasFlag = (name) => args.includes(name);
const option = (name) => {
  const a = args.find((x) => x.startsWith(name + "="));
  return a ? a.slice(name.length + 1) : undefined;
};

const apply = hasFlag("--apply");
const allowRemote = hasFlag("--allow-remote");
const confirmDb = option("--confirm-db");
const restoreFile = option("--restore");

const MODELS = ["company", "invoice", "payment", "shipment"];
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

function parseTarget(url) {
  const m = url.match(/^mongodb(?:\+srv)?:\/\/(?:[^@/]*@)?([^/?]+)\/?([^?]*)/);
  if (!m) return null;
  const hosts = m[1].split(",").map((h) => h.replace(/:\d+$/, "").toLowerCase());
  let database = m[2] || "";
  try {
    database = decodeURIComponent(database);
  } catch {
    /* keep raw */
  }
  return { hosts, database };
}

function fail(message, code = 1) {
  console.error(message);
  process.exit(code);
}

const target = parseTarget(process.env.DATABASE_URL ?? "");
if (!target) fail("DATABASE_URL is missing or is not a MongoDB connection string.");
const isLocal = target.hosts.length > 0 && target.hosts.every((h) => LOCAL_HOSTS.has(h));
console.log(`Target: host=${target.hosts.join(", ")}  database=${target.database || "(none)"}  [${isLocal ? "LOCAL" : "REMOTE"}]`);

if (!isLocal && !allowRemote) {
  fail("Refusing to run against a remote database. Pass --allow-remote if you really mean it.");
}
if (apply && !isLocal && confirmDb !== target.database) {
  fail(
    `Remote write needs confirmation. Re-run with --confirm-db=${target.database || "<database name>"} ` +
      "to show you are sure this is the right database."
  );
}

const prisma = new PrismaClient();

/** Row counts and every amount total that must be identical before and after. */
async function snapshot() {
  const [companies, invoices, payments, shipments, inv, pay, ship] = await Promise.all([
    prisma.company.count(),
    prisma.invoice.count(),
    prisma.payment.count(),
    prisma.shipment.count(),
    prisma.invoice.aggregate({ _sum: { subtotal: true, totalAmount: true, paidAmount: true, balanceAmount: true } }),
    prisma.payment.aggregate({ _sum: { amount: true } }),
    prisma.shipment.aggregate({ _sum: { cargoValue: true } }),
  ]);
  return {
    companies,
    invoices,
    payments,
    shipments,
    invoiceSubtotal: inv._sum.subtotal ?? 0,
    invoiceTotal: inv._sum.totalAmount ?? 0,
    invoicePaid: inv._sum.paidAmount ?? 0,
    invoiceBalance: inv._sum.balanceAmount ?? 0,
    paymentAmount: pay._sum.amount ?? 0,
    shipmentCargoValue: ship._sum.cargoValue ?? 0,
  };
}

function sameSnapshot(a, b) {
  return Object.keys(a).every((k) => Math.abs(a[k] - b[k]) <= 1e-6 * Math.max(1, Math.abs(a[k])));
}

async function breakdown(model) {
  const rows = await prisma[model].groupBy({ by: ["currency"], _count: { _all: true } });
  return rows.map((r) => `${r.currency}=${r._count._all}`).join("  ") || "(no rows)";
}

async function runRetag() {
  console.log("\nCurrent currencies:");
  let totalToChange = 0;
  for (const m of MODELS) {
    const toChange = await prisma[m].count({ where: { currency: { not: "AED" } } });
    totalToChange += toChange;
    console.log(`  ${m.padEnd(9)} ${await breakdown(m)}   -> ${toChange} would change`);
  }
  const before = await snapshot();

  if (!apply) {
    console.log(`\nDry run only: ${totalToChange} row(s) would be set to AED. Re-run with --apply to write.`);
    return;
  }
  if (totalToChange === 0) {
    console.log("\nNothing to do: everything is already AED.");
    return;
  }

  // 1) Save the old values first. If this fails nothing has been changed.
  const backup = { createdAt: new Date().toISOString(), database: target.database, models: {} };
  for (const m of MODELS) {
    backup.models[m] = await prisma[m].findMany({
      where: { currency: { not: "AED" } },
      select: { id: true, currency: true },
    });
  }
  const file = `currency-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  fs.writeFileSync(file, JSON.stringify(backup, null, 2));
  const saved = JSON.parse(fs.readFileSync(file, "utf8"));
  const savedCount = MODELS.reduce((n, m) => n + saved.models[m].length, 0);
  if (savedCount !== totalToChange) fail(`Backup file check failed (${savedCount} saved, ${totalToChange} expected). Nothing was changed.`);
  console.log(`\nBackup of old values saved: ${file} (${savedCount} row(s))`);

  // 2) Write the change.
  for (const m of MODELS) {
    const res = await prisma[m].updateMany({ where: { currency: { not: "AED" } }, data: { currency: "AED" } });
    console.log(`  ${m.padEnd(9)} ${res.count} row(s) set to AED`);
  }

  // 3) Verify.
  const after = await snapshot();
  let remaining = 0;
  for (const m of MODELS) remaining += await prisma[m].count({ where: { currency: { not: "AED" } } });
  const amountsOk = sameSnapshot(before, after);
  console.log("\nVerification:");
  console.log(`  rows still not AED ........ ${remaining} ${remaining === 0 ? "OK" : "PROBLEM"}`);
  console.log(`  counts and amount totals .. ${amountsOk ? "identical OK" : "DIFFERENT - PROBLEM"}`);
  if (!amountsOk) {
    console.error("Before:", before, "\nAfter: ", after, "\nAmounts changed unexpectedly. Restore your backup.");
    process.exitCode = 2;
  } else if (remaining !== 0) {
    process.exitCode = 2;
  } else {
    console.log("\nAll good. Keep the backup file and your database backup for a while.");
  }
}

async function runRestore() {
  const data = JSON.parse(fs.readFileSync(restoreFile, "utf8"));
  if (data.database && data.database !== target.database) {
    fail(`This backup is from database "${data.database}" but you are connected to "${target.database}". Aborting.`);
  }
  console.log(`\nRestoring old currencies from ${restoreFile} (made ${data.createdAt})`);
  for (const m of MODELS) {
    const rows = data.models?.[m] ?? [];
    const byCurrency = new Map();
    for (const r of rows) byCurrency.set(r.currency, [...(byCurrency.get(r.currency) ?? []), r.id]);
    for (const [currency, ids] of byCurrency) {
      if (!apply) {
        console.log(`  ${m.padEnd(9)} would set ${ids.length} row(s) back to ${currency}`);
        continue;
      }
      const res = await prisma[m].updateMany({ where: { id: { in: ids } }, data: { currency } });
      console.log(`  ${m.padEnd(9)} ${res.count} row(s) set back to ${currency}`);
    }
  }
  if (!apply) console.log("\nDry run only. Re-run with --apply to restore.");
}

(restoreFile ? runRestore() : runRetag())
  .catch((e) => {
    console.error("Failed:", e.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
