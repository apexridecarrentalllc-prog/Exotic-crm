// Run: node scripts/check-db.js (loads .env.local from repo root)
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env.local"), override: true });

const url = process.env.DATABASE_URL || "";
const type = url.startsWith("mongodb") ? "MongoDB" : url.startsWith("postgres") ? "PostgreSQL" : url ? "Other" : "NOT SET";
const host = url.match(/@([^/?]+)/)?.[1] || "N/A";

console.log("--- Database configuration ---");
console.log("DATABASE_URL type:", type);
console.log("Host (from URL):", host);
console.log("");

if (!url) {
  console.log("Result: NOT CONNECTED (no DATABASE_URL)");
  process.exit(1);
}

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

prisma.$connect()
  .then(() => {
    console.log("Result: CONNECTED (" + type + ")");
    return prisma.$disconnect();
  })
  .then(() => process.exit(0))
  .catch((e) => {
    console.log("Result: CONNECTION FAILED");
    console.log("Error:", e.message);
    process.exit(1);
  });
