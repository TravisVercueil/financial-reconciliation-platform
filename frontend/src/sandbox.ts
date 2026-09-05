import ledger from "../../fixtures/ledger.csv?raw";
import bank from "../../fixtures/bank.csv?raw";
const key = "travis-recon-sandbox-v1";
type Review = {
  source: string;
  id: string;
  reason: string;
  actor: string;
  at: string;
};
let state: { loaded: boolean; history: Review[] } = {
  loaded: false,
  history: [],
};
try {
  const saved = JSON.parse(localStorage.getItem(key) || "null");
  if (
    saved &&
    typeof saved.loaded === "boolean" &&
    Array.isArray(saved.history)
  )
    state = saved;
} catch {
  /* Storage can be unavailable in private browsers. */
}
function save() {
  try {
    localStorage.setItem(key, JSON.stringify(state));
  } catch {
    /* Keep this session usable when storage is unavailable. */
  }
}
// Predefined fixtures demonstrate the workflow; financial matching runs only in Java.
const rows = [
  ["ledger", ledger],
  ["bank", bank],
].flatMap(([source, csv]) =>
  csv
    .trim()
    .split("\n")
    .slice(1)
    .map((line) => {
      const [id, account, currency, amount, reference] = line.split(",");
      return { source, id, account, currency, amount, reference };
    }),
);
export function sandboxRequest(path: string, init?: RequestInit): unknown {
  if (path === "/report")
    return state.loaded
      ? rows.map((entry) => {
          const reviewed = state.history.find(
            (h) => h.source === entry.source && h.id === entry.id,
          );
          const matched = ["INV-2401", "INV-2403", "REFUND-104"].includes(
            entry.reference,
          );
          return {
            entry,
            status: matched
              ? "matched"
              : reviewed
                ? "reviewed"
                : entry.reference === "INV-2405"
                  ? "ambiguous"
                  : "unmatched",
            reason: reviewed?.reason ?? null,
            explanation: matched
              ? "Unique counterpart with identical account, currency, amount and reference."
              : entry.reference === "INV-2405"
                ? "Multiple candidates share this matching identity. No automatic match was selected."
                : "No exact counterpart. Check the reference, amount, account and currency before resolving.",
          };
        })
      : [];
  if (path === "/history") return state.history;
  if (path.startsWith("/imports/")) {
    const inserted = state.loaded ? 0 : 6;
    if (path.endsWith("bank")) {
      state.loaded = true;
      save();
    }
    return { inserted, duplicates: inserted ? 0 : 6 };
  }
  if (path === "/resolutions") {
    const body = JSON.parse(String(init?.body));
    if (
      typeof body.reason !== "string" ||
      body.reason.trim().length < 10 ||
      body.reason.length > 1000
    )
      throw new Error(
        "Provide a meaningful review reason (10–1,000 characters).",
      );
    if (state.history.some((h) => h.source === body.source && h.id === body.id))
      throw new Error("This exception has already been reviewed.");
    state.history.unshift({
      ...body,
      actor: "Demo operator",
      at: new Date().toISOString(),
    });
    save();
    return undefined;
  }
  throw new Error("This action requires the local backend.");
}
