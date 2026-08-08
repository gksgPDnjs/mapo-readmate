export type BookSearchQuery = {
  title?: string;
  isbn13?: string;
  page?: number;
  pageSize?: number;
};

export type CanonicalBookCandidate = {
  externalId: string;
  title: string;
  isbn13: string | null;
  author: string | null;
  publisher: string | null;
  publishedOn: string | null;
  pageCount: number | null;
  format: string | null;
  raw: Record<string, unknown>;
};

export type LoanBookCandidate = CanonicalBookCandidate & {
  loanCount: number | null;
  loanRank: number | null;
};

export interface BookProvider {
  readonly sourceCode: string;
  search(query: BookSearchQuery): Promise<CanonicalBookCandidate[]>;
  findByIsbn(isbn13: string): Promise<CanonicalBookCandidate | null>;
}

export interface LoanSignalProvider {
  readonly sourceCode: string;
  listPopularLoans(query: {
    startDate: string;
    endDate: string;
    fromAge: number;
    toAge: number;
    page?: number;
    pageSize?: number;
    region?: string;
  }): Promise<LoanBookCandidate[]>;
}