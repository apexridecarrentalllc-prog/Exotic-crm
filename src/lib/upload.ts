import { mkdir, writeFile } from "fs/promises";
import path from "path";

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20MB
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword", // DOC
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // DOCX
  "application/vnd.ms-excel", // XLS
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // XLSX
  "image/png",
  "image/jpeg",
  "image/jpg",
]);

const ALLOWED_EXTENSIONS = new Set([
  "pdf", "doc", "docx", "xls", "xlsx", "png", "jpg", "jpeg",
]);

export type DocumentType =
  | "BILL_OF_LADING"
  | "PORT_CLEARANCE"
  | "CUSTOMS_DECLARATION"
  | "DELIVERY_RECEIPT"
  | "INVOICE_COPY"
  | "TRANSPORT_DOC"
  | "INSURANCE"
  | "OTHER";

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200);
}

function getExtension(name: string): string {
  const last = name.split(".").pop();
  return last ? last.toLowerCase() : "";
}

/**
 * Validates and saves an uploaded file for a shipment.
 * Saves to public/uploads/shipments/[shipmentId]/[type]/[timestamp]-[filename]
 * Returns { filePath, fileName, fileSize, mimeType } or throws.
 */
export async function saveFile(
  file: File,
  shipmentId: string,
  type: DocumentType
): Promise<{ filePath: string; fileName: string; fileSize: number; mimeType: string }> {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error("File size exceeds 20MB limit");
  }

  const ext = getExtension(file.name);
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw new Error(
      "Allowed types: PDF, DOC, DOCX, XLS, XLSX, PNG, JPG, JPEG"
    );
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    throw new Error(
      "Invalid file type. Allowed: PDF, DOC, DOCX, XLS, XLSX, PNG, JPG, JPEG"
    );
  }

  const timestamp = Date.now();
  const safeName = sanitizeFileName(file.name);
  const fileName = `${timestamp}-${safeName}`;
  const relativeDir = path.join("uploads", "shipments", shipmentId, type);
  const publicDir = path.join(process.cwd(), "public", relativeDir);

  await mkdir(publicDir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  const fullPath = path.join(publicDir, fileName);
  await writeFile(fullPath, buffer);

  const filePath = path.join(relativeDir, fileName).replace(/\\/g, "/");
  return {
    filePath: "/" + filePath,
    fileName,
    fileSize: file.size,
    mimeType: file.type,
  };
}

const LOGO_MAX_SIZE = 2 * 1024 * 1024; // 2MB
const LOGO_MIMES = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp"]);
const LOGO_EXT = new Set(["png", "jpg", "jpeg", "webp"]);

/**
 * Save company logo to public/uploads/logo/. Returns public URL path (e.g. /uploads/logo/123-logo.png).
 */
export async function saveLogoFile(file: File): Promise<string> {
  if (file.size > LOGO_MAX_SIZE) {
    throw new Error("Logo size must be under 2MB");
  }
  const ext = getExtension(file.name);
  if (!LOGO_EXT.has(ext) || !LOGO_MIMES.has(file.type)) {
    throw new Error("Logo must be PNG, JPG, or WebP");
  }
  const relativeDir = path.join("uploads", "logo");
  const publicDir = path.join(process.cwd(), "public", relativeDir);
  await mkdir(publicDir, { recursive: true });
  const fileName = `logo-${Date.now()}.${ext}`;
  const fullPath = path.join(publicDir, fileName);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(fullPath, buffer);
  const filePath = path.join(relativeDir, fileName).replace(/\\/g, "/");
  return "/" + filePath;
}
