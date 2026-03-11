import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function toNum(d: unknown): number {
  if (d == null) return 0;
  if (typeof d === "number" && !Number.isNaN(d)) return d;
  if (
    typeof d === "object" &&
    d !== null &&
    "toNumber" in d &&
    typeof (d as { toNumber: () => number }).toNumber === "function"
  ) {
    return (d as { toNumber: () => number }).toNumber();
  }
  const n = Number(d);
  return Number.isNaN(n) ? 0 : n;
}
