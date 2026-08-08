import { existsSync } from "node:fs";

type CheckResult = {
  source: string;
  status: "ready" | "missing" | "failed";
  detail: string;
};

type SourceCheck = {
  source: string;
  requiredVariables: string[];
  request: (values: Record<string, string>) => URL;
};

if (existsSync(".env")) {
  process.loadEnvFile();
}

const sourceChecks: SourceCheck[] = [
  {
    source: "Aladin TTB",
    requiredVariables: ["ALADIN_TTB_KEY"],
    request: ({ ALADIN_TTB_KEY }) => {
      const url = new URL("https://www.aladin.co.kr/ttb/api/ItemSearch.aspx");
      url.search = new URLSearchParams({
        TTBKey: ALADIN_TTB_KEY,
        Query: "9788936434496",
        QueryType: "ISBN",
        SearchTarget: "Book",
        output: "js",
        Version: "20131101",
      }).toString();
      return url;
    },
  },
  {
    source: "Google Books",
    requiredVariables: ["GOOGLE_BOOKS_API_KEY"],
    request: ({ GOOGLE_BOOKS_API_KEY }) => {
      const url = new URL("https://www.googleapis.com/books/v1/volumes");
      url.search = new URLSearchParams({
        q: "isbn:9788936434496",
        key: GOOGLE_BOOKS_API_KEY,
      }).toString();
      return url;
    },
  },
  {
    source: "Data4Library",
    requiredVariables: ["DATA4LIBRARY_API_KEY"],
    request: ({ DATA4LIBRARY_API_KEY }) => {
      const url = new URL("https://data4library.kr/api/libSrch");
      url.search = new URLSearchParams({
        authKey: DATA4LIBRARY_API_KEY,
        format: "json",
        region: "11",
        pageNo: "1",
        pageSize: "1",
      }).toString();
      return url;
    },
  },
  {
    source: "National Library",
    requiredVariables: ["NATIONAL_LIBRARY_CERT_KEY"],
    request: ({ NATIONAL_LIBRARY_CERT_KEY }) => {
      const url = new URL("https://www.nl.go.kr/seoji/SearchApi.do");
      url.search = new URLSearchParams({
        cert_key: NATIONAL_LIBRARY_CERT_KEY,
        result_style: "json",
        isbn: "9788936433598",
      }).toString();
      return url;
    },
  },
];

async function checkSource(sourceCheck: SourceCheck): Promise<CheckResult> {
  const values = Object.fromEntries(
    sourceCheck.requiredVariables.map((name) => [name, process.env[name] ?? ""]),
  );
  const missingVariables = sourceCheck.requiredVariables.filter((name) => !values[name]);

  if (missingVariables.length > 0) {
    return {
      source: sourceCheck.source,
      status: "missing",
      detail: `missing ${missingVariables.join(", ")}`,
    };
  }

  try {
    const response = await fetch(sourceCheck.request(values), {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    });
    const body = await response.text();

    if (!response.ok) {
      return {
        source: sourceCheck.source,
        status: "failed",
        detail: `HTTP ${response.status}`,
      };
    }

    if (!body.trim() || /authErr|errorCode|errorMessage/i.test(body)) {
      return {
        source: sourceCheck.source,
        status: "failed",
        detail: "authentication or API response error",
      };
    }

    return { source: sourceCheck.source, status: "ready", detail: "connection verified" };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "request failed";
    return { source: sourceCheck.source, status: "failed", detail };
  }
}

const results = await Promise.all(sourceChecks.map(checkSource));

for (const result of results) {
  console.log(`[${result.status}] ${result.source}: ${result.detail}`);
}

if (results.some((result) => result.status !== "ready")) {
  process.exitCode = 1;
}