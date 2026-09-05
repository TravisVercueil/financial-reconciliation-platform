import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";
import { sandboxRequest } from "./sandbox";
const sandbox = import.meta.env.VITE_DEMO_MODE === "true";
import ledger from "../../fixtures/ledger.csv?raw";
import bank from "../../fixtures/bank.csv?raw";
type Entry = {
  source: string;
  id: string;
  account: string;
  currency: string;
  amount: string;
  reference: string;
};
type Item = {
  entry: Entry;
  status: string;
  explanation: string;
  reason: string | null;
};
type History = {
  source: string;
  id: string;
  reason: string;
  actor: string;
  at: string;
};
async function api<T>(path: string, init?: RequestInit): Promise<T> {
  if (sandbox) return sandboxRequest(path, init) as T;
  const response = await fetch("/api" + path, init);
  if (!response.ok) {
    const body = await response.json().catch(() => ({
      message: "Request failed. Check the backend and retry.",
    }));
    throw new Error(body.message || "Request failed.");
  }
  return response.status === 204 ? (undefined as T) : response.json();
}
function formatMoney(value: string) {
  const [whole, fraction = "00"] = String(value).split(".");
  return `${whole === "-0" ? "-0" : BigInt(whole).toLocaleString("en-ZA")}.${fraction.padEnd(2, "0")}`;
}
function App() {
  const [items, setItems] = useState<Item[]>([]),
    [history, setHistory] = useState<History[]>([]),
    [filter, setFilter] = useState("all"),
    [selected, setSelected] = useState<Item | null>(null),
    [reason, setReason] = useState(""),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [source, setSource] = useState("bank");
  async function refresh() {
    const [i, h] = await Promise.all([
      api<Item[]>("/report"),
      api<History[]>("/history"),
    ]);
    setItems(i);
    setHistory(h);
  }
  useEffect(() => {
    refresh()
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  async function run(task: () => Promise<void>) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await task();
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error.");
    } finally {
      setBusy(false);
    }
  }
  async function upload(csv: string, from: string) {
    return api<{ inserted: number; duplicates: number }>("/imports/" + from, {
      method: "POST",
      headers: { "Content-Type": "text/csv" },
      body: csv,
    });
  }
  const matched = items.filter((x) => x.status === "matched").length,
    open = items.filter((x) =>
      ["unmatched", "ambiguous"].includes(x.status),
    ).length,
    reviewed = items.filter((x) => x.status === "reviewed").length;
  const visible = items.filter(
    (x) =>
      filter === "all" ||
      (filter === "open" && ["unmatched", "ambiguous"].includes(x.status)) ||
      x.status === filter,
  );
  return (
    <div className="app">
      <a className="skip" href="#main">
        Skip to workspace
      </a>
      <aside>
        <a className="brand" href="#main">
          <span className="mark">r/</span> recon
          <span className="brand-dot">.</span>
        </a>
        <div className="aside-label">WORKSPACE</div>
        <a className="nav-active" href="#main">
          ↔ <span>Reconciliation</span>
          <span className="count">{open}</span>
        </a>
        <a href="#activity">
          ↳ <span>Review history</span>
        </a>
        <div className="aside-bottom">
          <span className="avatar">TV</span>
          <div>
            Travis Vercueil<small>Engineering portfolio</small>
          </div>
        </div>
      </aside>
      <div className="content">
        <header>
          <div>
            Operations <span>/</span> Reconciliation
          </div>
          <span className="demo">
            <i />{" "}
            {sandbox
              ? "Interactive sandbox · synthetic data · changes stay in this browser"
              : "Local demo · synthetic data"}
          </span>
        </header>
        <main id="main">
          <div className="intro">
            <div>
              <p className="eyebrow">FINANCIAL OPERATIONS / 01</p>
              <h1>
                Every transaction.
                <br />
                <em>Accounted for.</em>
              </h1>
              <p className="subtitle">
                Match the records. Investigate the differences.
                <br />
                Keep the decision trail.
              </p>
            </div>
            <div className="intro-note">
              <span className="live-dot" /> Deterministic matching
              <p>
                Account + currency + amount + reference.
                <br />
                Only unique counterparts match.
              </p>
            </div>
          </div>
          <div className="toolbar">
            <div>
              <h2>Reconciliation workspace</h2>
              <p>One place to review ledger and bank entries.</p>
            </div>
            <button
              className="primary"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  const a = await upload(ledger, "ledger");
                  const b = await upload(bank, "bank");
                  setMessage(
                    `Demo loaded: ${a.inserted + b.inserted} entries added, ${a.duplicates + b.duplicates} replays skipped.`,
                  );
                })
              }
            >
              {busy
                ? "Working…"
                : items.length
                  ? "Replay sample data ↻"
                  : "Load sample data ↗"}
            </button>
          </div>
          <section className="stats" aria-label="Reconciliation summary">
            <div>
              <span>Imported entries</span>
              <strong>{items.length.toString().padStart(2, "0")}</strong>
              <small>Both sources combined</small>
            </div>
            <div>
              <span>Matched entries</span>
              <strong className="green">
                {matched.toString().padStart(2, "0")}
              </strong>
              <small>{matched / 2} unique pairs</small>
            </div>
            <div>
              <span>Open exceptions</span>
              <strong className="amber">
                {open.toString().padStart(2, "0")}
              </strong>
              <small>Require investigation</small>
            </div>
            <div>
              <span>Reviewed exceptions</span>
              <strong>{reviewed.toString().padStart(2, "0")}</strong>
              <small>Reason recorded · no postings</small>
            </div>
          </section>
          <div role="status" className={message ? "notice" : ""}>
            {message}
          </div>
          {error && (
            <div role="alert" className="error">
              {error}{" "}
              <button onClick={() => run(refresh)}>Retry connection</button>
            </div>
          )}
          <section className="records">
            <div className="table-toolbar">
              <div className="filters" aria-label="Filter entries">
                {[
                  ["all", "All entries"],
                  ["open", "Open"],
                  ["matched", "Matched"],
                  ["reviewed", "Reviewed"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    aria-pressed={filter === value}
                    onClick={() => setFilter(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <span>{visible.length} entries</span>
            </div>
            {loading ? (
              <p className="empty">Connecting to the workspace…</p>
            ) : !visible.length ? (
              <div className="empty">
                <h3>
                  {items.length
                    ? "No entries in this view."
                    : "Start with a realistic reconciliation batch."}
                </h3>
                <p>
                  {items.length
                    ? "Choose another filter to see the other entries."
                    : "Load sample data to investigate partial payments, a bank fee and ambiguous references."}
                </p>
              </div>
            ) : (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Reference / entry</th>
                      <th>Source</th>
                      <th>Account</th>
                      <th className="numeric">Amount</th>
                      <th>Status</th>
                      <th>
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((item) => (
                      <tr key={item.entry.source + item.entry.id}>
                        <td>
                          <b>{item.entry.reference}</b>
                          <small>{item.entry.id}</small>
                        </td>
                        <td>
                          <span className="source">{item.entry.source}</span>
                        </td>
                        <td className="account">{item.entry.account}</td>
                        <td className="numeric amount">
                          {item.entry.currency} {formatMoney(item.entry.amount)}
                        </td>
                        <td>
                          <span className={"status " + item.status}>
                            <i />
                            {item.status}
                          </span>
                        </td>
                        <td>
                          <button
                            className="text-button"
                            onClick={() => {
                              setSelected(item);
                              setReason("");
                            }}
                            aria-label={"Inspect " + item.entry.id}
                          >
                            Inspect ↗
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          <div className="bottom-grid">
            <section className="import">
              <p className="eyebrow">BRING YOUR OWN SYNTHETIC DATA</p>
              <h2>Import a CSV batch</h2>
              <p>
                Atomic imports. Identical replays are skipped. Conflicting IDs
                reject the entire batch.
              </p>
              <div className="import-controls">
                <label>
                  Source
                  <select
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    disabled={busy}
                  >
                    <option value="bank">Bank statement</option>
                    <option value="ledger">Ledger entries</option>
                  </select>
                </label>
                <label className="file-label">
                  Choose CSV
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    disabled={busy || sandbox}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      e.target.value = "";
                      if (f)
                        run(async () => {
                          if (f.size > 200000)
                            throw new Error("CSV must be at most 200 KB.");
                          const result = await upload(await f.text(), source);
                          setMessage(
                            `${result.inserted} entries imported. ${result.duplicates} identical replays skipped.`,
                          );
                        });
                    }}
                  />
                </label>
              </div>
              <code>id,account,currency,amount,reference</code>
              <p className="fine">
                {sandbox
                  ? "Custom CSV imports require the locally running Java backend. This sandbox uses predefined sample cases. "
                  : ""}
                Up to 1,000 rows · ZAR, USD, EUR, GBP · two decimal places
              </p>
            </section>
            <section id="activity" className="activity">
              <p className="eyebrow">DECISIONS, WITH CONTEXT</p>
              <h2>
                Review history <span>{history.length}</span>
              </h2>
              {!history.length ? (
                <p>
                  No reviews yet. Inspect an open exception and record your
                  investigation.
                </p>
              ) : (
                <ol>
                  {history.map((h) => (
                    <li key={h.source + h.id}>
                      <b>
                        {h.id} <span>{h.source}</span>
                      </b>
                      <p>{h.reason}</p>
                      <small>
                        {h.actor} · {new Date(h.at).toLocaleString()}
                      </small>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>
          <footer>
            Built by Travis Vercueil{" "}
            <span>Java / Spring Boot / React / PostgreSQL</span>
          </footer>
        </main>
      </div>
      {selected && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelected(null);
          }}
        >
          <dialog
            open
            aria-labelledby="review-title"
            onKeyDown={(e) => {
              if (e.key === "Escape") setSelected(null);
              if (e.key === "Tab") {
                const nodes = Array.from(
                  e.currentTarget.querySelectorAll<HTMLElement>(
                    "button,textarea",
                  ),
                ).filter((n) => !(n as HTMLButtonElement).disabled);
                const first = nodes[0],
                  last = nodes[nodes.length - 1];
                if (e.shiftKey && document.activeElement === first) {
                  e.preventDefault();
                  last.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                  e.preventDefault();
                  first.focus();
                }
              }
            }}
          >
            <button
              className="close"
              autoFocus
              onClick={() => setSelected(null)}
              aria-label="Close inspection"
            >
              ×
            </button>
            <p className="eyebrow">EXCEPTION INSPECTION</p>
            <h2 id="review-title">{selected.entry.reference}</h2>
            <p>
              {selected.entry.id} · {selected.entry.source} ·{" "}
              {selected.entry.currency} {selected.entry.amount}
            </p>
            <div className="explanation">
              <b>Matching evidence</b>
              <p>{selected.explanation}</p>
              <small>Rule-based explanation · no AI model involved</small>
            </div>
            {selected.reason && (
              <p>
                <b>Review reason:</b> {selected.reason}
              </p>
            )}
            {["unmatched", "ambiguous"].includes(selected.status) ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  run(async () => {
                    await api("/resolutions", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        source: selected.entry.source,
                        id: selected.entry.id,
                        reason,
                      }),
                    });
                    setSelected(null);
                    setMessage(
                      "Exception reviewed. Reason saved to history. No financial posting was created.",
                    );
                  });
                }}
              >
                <label htmlFor="reason">
                  Investigation / resolution reason
                </label>
                <textarea
                  id="reason"
                  required
                  minLength={10}
                  maxLength={1000}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="What did you verify, and what happens next?"
                />
                <p className="fine">
                  Reviewing acknowledges this exception. It does not match
                  entries or move money.
                </p>
                {error && (
                  <p role="alert" className="error">
                    {error}
                  </p>
                )}
                <button className="primary" disabled={busy}>
                  {busy ? "Saving…" : "Record review"}
                </button>
              </form>
            ) : (
              <button onClick={() => setSelected(null)}>
                Close inspection
              </button>
            )}
          </dialog>
        </div>
      )}
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
