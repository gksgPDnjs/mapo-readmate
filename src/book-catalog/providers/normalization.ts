import { createHash } from "node:crypto";

export function normalizeText(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") {
    return null;
  }
  const normalized = String(value).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return normalized || null;
}

export function normalizeIsbn13(value: unknown): string | null {
  const isbn = normalizeText(value)?.replace(/[^0-9]/g, "");
  if (!isbn || isbn.length !== 13) {
    return null;
  }
  const checksum = isbn.slice(0, 12).split("").reduce((sum, digit, index) => sum + Number(digit) * (index % 2 === 0 ? 1 : 3), 0);
  return (10 - (checksum % 10)) % 10 === Number(isbn[12]) ? isbn : null;
}

export function parseIsoDate(value: unknown): string | null {
  const digits = normalizeText(value)?.replace(/[^0-9]/g, "");
  if (!digits || digits.length < 8) {
    return null;
  }
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}

export function parsePublicationYear(value: unknown): string | null {
  const year = normalizeText(value)?.match(/^\d{4}/)?.[0];
  return year ? `${year}-01-01` : null;
}

export function parsePositiveInteger(value: unknown): number | null {
  const digits = normalizeText(value)?.replace(/,/g, "").match(/\d+/)?.[0];
  if (!digits) {
    return null;
  }
  const parsed = Number(digits);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export function sha256(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function extractRecords(payload: unknown, titleKeys: string[]): Record<string, unknown>[] {
  const records: Record<string, unknown>[] = [];
  const visit = (value: unknown): void => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (!value || typeof value !== "object") {
      return;
    }
    const record = value as Record<string, unknown>;
    if (titleKeys.some((key) => normalizeText(record[key]))) {
      records.push(record);
      return;
    }
    Object.values(record).forEach(visit);
  };
  visit(payload);
  return records;
}

export function firstText(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = normalizeText(record[key]);
    if (value) {
      return value;
    }
  }
  return null;
}