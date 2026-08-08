import {
  firstText,
  normalizeIsbn13,
  normalizeText,
  parsePublicationYear,
  sha256,
} from "./normalization.js";
import type { BookProvider, BookSearchQuery, CanonicalBookCandidate } from "./types.js";

type OpenLibraryDocument = Record<string, unknown>;

export class OpenLibraryProvider implements BookProvider {
  readonly sourceCode = "open_library";

  async search(query: BookSearchQuery): Promise<CanonicalBookCandidate[]> {
    const keyword = query.isbn13 ?? query.title;
    if (!keyword) {
      throw new Error("Open Library search requires title or isbn13.");
    }
    return this.searchPage(keyword, Math.max(0, (query.page ?? 1) - 1) * (query.pageSize ?? 20), query.pageSize ?? 20);
  }

  async findByIsbn(isbn13: string): Promise<CanonicalBookCandidate | null> {
    return (await this.search({ isbn13, pageSize: 1 }))[0] ?? null;
  }

  async searchPage(keyword: string, offset: number, limit: number): Promise<CanonicalBookCandidate[]> {
    const params = new URLSearchParams({ q: keyword, language: "kor", limit: String(limit), offset: String(offset) });
    const response = await fetch(`https://openlibrary.org/search.json?${params}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) {
      throw new Error(`Open Library API request failed with HTTP ${response.status}.`);
    }
    const payload = await response.json() as { docs?: unknown[] };
    return (payload.docs ?? []).flatMap((value) => this.toCandidate(value));
  }

  private toCandidate(value: unknown): CanonicalBookCandidate[] {
    if (!value || typeof value !== "object") {
      return [];
    }
    const raw = value as OpenLibraryDocument;
    const title = normalizeText(raw.title);
    const externalId = normalizeText(raw.key);
    if (!title || !externalId) {
      return [];
    }
    const isbnValues = Array.isArray(raw.isbn) ? raw.isbn : [];
    const isbn13 = isbnValues.map(normalizeIsbn13).find((isbn): isbn is string => isbn !== null) ?? null;
    const authors = Array.isArray(raw.author_name)
      ? raw.author_name.map(normalizeText).filter((author): author is string => author !== null).join(", ")
      : firstText(raw, ["author_name"]);
    return [{
      externalId: externalId || sha256(raw),
      title,
      isbn13,
      author: authors || null,
      publisher: Array.isArray(raw.publisher) ? normalizeText(raw.publisher[0]) : firstText(raw, ["publisher"]),
      publishedOn: parsePublicationYear(raw.first_publish_year),
      pageCount: null,
      format: null,
      raw,
    }];
  }
}