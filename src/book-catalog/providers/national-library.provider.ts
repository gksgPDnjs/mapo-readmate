import {
  extractRecords,
  firstText,
  normalizeIsbn13,
  parseIsoDate,
  parsePositiveInteger,
  sha256,
} from "./normalization.js";
import type { BookProvider, BookSearchQuery, CanonicalBookCandidate } from "./types.js";

export class NationalLibraryProvider implements BookProvider {
  readonly sourceCode = "national_library_isbn";

  constructor(private readonly certKey: string) {}

  async search(query: BookSearchQuery): Promise<CanonicalBookCandidate[]> {
    if (!query.title && !query.isbn13) {
      throw new Error("National Library search requires title or isbn13.");
    }
    const search = new URLSearchParams({
      cert_key: this.certKey,
      result_style: "json",
      page_no: String(query.page ?? 1),
      page_size: String(query.pageSize ?? 20),
    });
    if (query.isbn13) {
      search.set("isbn", query.isbn13);
    } else if (query.title) {
      search.set("title", query.title);
    }
    const response = await fetch(`https://www.nl.go.kr/seoji/SearchApi.do?${search}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15_000),
    });
    const body = await response.text();
    if (!response.ok) {
      throw new Error(`National Library API request failed with HTTP ${response.status}.`);
    }
    let payload: unknown;
    try {
      payload = JSON.parse(body);
    } catch {
      throw new Error("National Library API returned non-JSON data.");
    }
    return extractRecords(payload, ["TITLE"]).flatMap((raw) => {
      const title = firstText(raw, ["TITLE"]);
      if (!title) {
        return [];
      }
      const isbn13 = normalizeIsbn13(raw.EA_ISBN);
      return [{
        externalId: firstText(raw, ["CONTROL_NO"]) ?? isbn13 ?? sha256(raw),
        title,
        isbn13,
        author: firstText(raw, ["AUTHOR"]),
        publisher: firstText(raw, ["PUBLISHER"]),
        publishedOn: parseIsoDate(raw.PUBLISH_PREDATE),
        pageCount: parsePositiveInteger(raw.PAGE),
        format: firstText(raw, ["FORM"]),
        raw,
      }];
    });
  }

  async findByIsbn(isbn13: string): Promise<CanonicalBookCandidate | null> {
    return (await this.search({ isbn13, pageSize: 1 }))[0] ?? null;
  }
}