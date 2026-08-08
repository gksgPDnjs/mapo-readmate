import {
  extractRecords,
  firstText,
  normalizeIsbn13,
  parsePositiveInteger,
  parsePublicationYear,
  sha256,
} from "./normalization.js";
import type { BookProvider, BookSearchQuery, CanonicalBookCandidate, LoanBookCandidate, LoanSignalProvider } from "./types.js";

export class Data4LibraryProvider implements BookProvider, LoanSignalProvider {
  readonly sourceCode = "data4library";

  constructor(private readonly apiKey: string) {}

  async search(query: BookSearchQuery): Promise<CanonicalBookCandidate[]> {
    const keyword = query.isbn13 ?? query.title;
    if (!keyword) {
      throw new Error("Data4Library search requires title or isbn13.");
    }
    const search = new URLSearchParams({
      authKey: this.apiKey,
      format: "json",
      keyword,
      pageNo: String(query.page ?? 1),
      pageSize: String(query.pageSize ?? 20),
    });
    return this.requestCandidates(`https://data4library.kr/api/srchBooks?${search}`);
  }

  async findByIsbn(isbn13: string): Promise<CanonicalBookCandidate | null> {
    return (await this.search({ isbn13, pageSize: 1 }))[0] ?? null;
  }

  async listPopularLoans(query: Parameters<LoanSignalProvider["listPopularLoans"]>[0]): Promise<LoanBookCandidate[]> {
    const search = new URLSearchParams({
      authKey: this.apiKey,
      format: "json",
      startDt: query.startDate,
      endDt: query.endDate,
      from_age: String(query.fromAge),
      to_age: String(query.toAge),
      pageNo: String(query.page ?? 1),
      pageSize: String(query.pageSize ?? 20),
    });
    if (query.region) {
      search.set("region", query.region);
    }
    const candidates = await this.requestCandidates(`https://data4library.kr/api/loanItemSrch?${search}`);
    return candidates.map((candidate) => ({
      ...candidate,
      loanCount: parsePositiveInteger(candidate.raw.loan_count ?? candidate.raw.loanCount),
      loanRank: parsePositiveInteger(candidate.raw.ranking ?? candidate.raw.rank),
    }));
  }

  private async requestCandidates(url: string): Promise<CanonicalBookCandidate[]> {
    const response = await fetch(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(15_000) });
    const body = await response.text();
    if (!response.ok) {
      throw new Error(`Data4Library API request failed with HTTP ${response.status}.`);
    }
    let payload: unknown;
    try {
      payload = JSON.parse(body);
    } catch {
      throw new Error("Data4Library API returned non-JSON data.");
    }
    return extractRecords(payload, ["bookname", "bookName", "BOOKNAME"]).flatMap((raw) => {
      const title = firstText(raw, ["bookname", "bookName", "BOOKNAME"]);
      if (!title) {
        return [];
      }
      const isbn13 = normalizeIsbn13(raw.isbn13 ?? raw.ISBN13 ?? raw.isbn ?? raw.ISBN);
      const author = firstText(raw, ["authors", "author", "AUTHOR"]);
      return [{
        externalId: isbn13 ?? `${title}:${author ?? "unknown"}:${firstText(raw, ["publication_year", "publicationYear"]) ?? "unknown"}`,
        title,
        isbn13,
        author,
        publisher: firstText(raw, ["publisher", "PUBLISHER"]),
        publishedOn: parsePublicationYear(raw.publication_year ?? raw.publicationYear),
        pageCount: null,
        format: null,
        raw,
      }];
    });
  }
}