import type { CodingCase } from "@/lib/coding/problems";

export type CaseResult = {
  index: number;
  passed: boolean;
  actual: string;
  expected: string;
  error?: string;
};

export type RunReport = {
  mode: "browser" | "not-run";
  results: CaseResult[];
  passed: number;
  total: number;
  message: string;
};

export function canonicalize(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map((item) => canonicalize(item)).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonicalize(item)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function outcomesMatch(actual: unknown, expected: unknown): boolean {
  return canonicalize(actual) === canonicalize(expected);
}

const WORKER_SOURCE = `
self.fetch = function () { return Promise.reject(new Error("Network is disabled in the arena.")); };
self.onmessage = function (event) {
  var code = event.data.code;
  var cases = event.data.cases;
  var results = [];
  var fn;
  try {
    fn = new Function(code + "\\n; return typeof solve === 'function' ? solve : null;")();
  } catch (error) {
    self.postMessage({ error: String(error && error.message || error).slice(0, 240), results: [] });
    return;
  }
  if (typeof fn !== "function") {
    self.postMessage({ error: "Define a function named solve.", results: [] });
    return;
  }
  function canon(value) {
    if (Array.isArray(value)) return "[" + value.map(canon).join(",") + "]";
    if (value && typeof value === "object") {
      var keys = Object.keys(value).sort();
      return "{" + keys.map(function (key) { return JSON.stringify(key) + ":" + canon(value[key]); }).join(",") + "}";
    }
    return JSON.stringify(value);
  }
  for (var index = 0; index < cases.length; index += 1) {
    var item = cases[index];
    try {
      var actual = fn.apply(null, item.args);
      results.push({ index: index, passed: canon(actual) === canon(item.expected), actual: canon(actual), expected: canon(item.expected) });
    } catch (error) {
      results.push({ index: index, passed: false, actual: "", expected: canon(item.expected), error: String(error && error.message || error).slice(0, 180) });
    }
  }
  self.postMessage({ results: results });
};
`;

export function runJavaScriptLocally(code: string, cases: CodingCase[], timeoutMs = 1500): Promise<RunReport> {
  if (typeof window === "undefined" || typeof Worker === "undefined") {
    return Promise.resolve({
      mode: "not-run",
      results: [],
      passed: 0,
      total: cases.length,
      message: "This browser cannot start the local JavaScript runner.",
    });
  }
  if (code.length > 20000) {
    return Promise.resolve({
      mode: "not-run",
      results: [],
      passed: 0,
      total: cases.length,
      message: "That solution is too long to run in the browser.",
    });
  }
  return new Promise((resolve) => {
    const blob = new Blob([WORKER_SOURCE], { type: "application/javascript" });
    const url = URL.createObjectURL(blob);
    const worker = new Worker(url);
    const finish = (report: RunReport) => {
      worker.terminate();
      URL.revokeObjectURL(url);
      resolve(report);
    };
    const timer = window.setTimeout(() => {
      finish({
        mode: "browser",
        results: [],
        passed: 0,
        total: cases.length,
        message: "The runner stopped the solution after 1.5 seconds.",
      });
    }, timeoutMs);
    worker.onerror = () => {
      window.clearTimeout(timer);
      finish({
        mode: "not-run",
        results: [],
        passed: 0,
        total: cases.length,
        message: "This browser blocked the local runner.",
      });
    };
    worker.onmessage = (event: MessageEvent<{ error?: string; results?: CaseResult[] }>) => {
      window.clearTimeout(timer);
      const results = event.data.results ?? [];
      const passed = results.filter((item) => item.passed).length;
      finish({
        mode: "browser",
        results,
        passed,
        total: cases.length,
        message: event.data.error
          ? event.data.error
          : `Ran in this browser. ${passed} of ${cases.length} sample cases passed. The server did not execute this code.`,
      });
    };
    worker.postMessage({ code, cases });
  });
}
