import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/ibm-plex-sans/latin-400.css";
import "@fontsource/ibm-plex-sans/latin-600.css";
import "@fontsource/ibm-plex-mono/latin-400.css";
import "./style.scss";
import {
  Button,
  ContentSwitcher,
  Switch,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  Tag,
  Select,
  SelectItem,
  TextArea,
  FileUploaderButton,
  InlineNotification,
  InlineLoading,
  Theme,
  Header,
  HeaderName,
  HeaderNavigation,
  HeaderMenuItem,
  DataTableSkeleton,
} from "@carbon/react";
import { Close, Renew, View } from "@carbon/react/icons";
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
  const inspectionTitle = useRef<HTMLHeadingElement>(null);
  const inspectTrigger = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (selected) inspectionTitle.current?.focus();
    else if (inspectTrigger.current) {
      if (inspectTrigger.current.isConnected) inspectTrigger.current.focus();
      else document.getElementById("main")?.focus();
    }
  }, [selected]);
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
  const filters = [
    ["all", "All entries"],
    ["open", "Open"],
    ["matched", "Matched"],
    ["reviewed", "Reviewed"],
  ];
  return (
    <Theme theme="g10" className="workbench">
      <Theme theme="g100" className="shell-theme">
        <Header aria-label="Recon">
          <HeaderName href="#main" prefix="">
            Recon
          </HeaderName>
          <HeaderNavigation aria-label="Workspace navigation">
            <HeaderMenuItem href="#main" isCurrentPage>
              Reconciliation
            </HeaderMenuItem>
            <HeaderMenuItem href="#activity">Review history</HeaderMenuItem>
          </HeaderNavigation>
        </Header>
      </Theme>
      <a className="skip-link" href="#main">
        Skip to workspace
      </a>
      <main id="main" tabIndex={-1}>
        <div className="mode-notice">
          <InlineNotification
            kind="info"
            lowContrast
            hideCloseButton
            title={sandbox ? "Interactive sandbox" : "Local demo"}
            subtitle={
              sandbox
                ? "Synthetic data. Changes stay in this browser."
                : "Synthetic data. Changes are saved by the local backend."
            }
          />
        </div>
        <div className="page-heading">
          <h1>Reconciliation</h1>
          <p>
            Exact matches require the same account, currency, amount and
            reference, with one unique counterpart on each side.
          </p>
        </div>
        <dl className="summary" aria-label="Reconciliation summary">
          <div>
            <dt>Imported entries</dt>
            <dd>{items.length}</dd>
          </div>
          <div>
            <dt>Matched entries</dt>
            <dd>
              {matched}
              <span> / {matched / 2} pairs</span>
            </dd>
          </div>
          <div>
            <dt>Open exceptions</dt>
            <dd>{open}</dd>
          </div>
          <div>
            <dt>Reviewed exceptions</dt>
            <dd>{reviewed}</dd>
          </div>
        </dl>
        {message && (
          <InlineNotification
            kind="success"
            lowContrast
            hideCloseButton
            title="Workspace updated"
            subtitle={message}
          />
        )}
        {error && (
          <div className="request-error">
            <InlineNotification
              kind="error"
              lowContrast
              hideCloseButton
              title="Request failed"
              subtitle={error}
            />
            <Button
              kind="tertiary"
              size="sm"
              onClick={() => run(refresh)}
              disabled={busy}
            >
              Retry connection
            </Button>
          </div>
        )}
        <section
          className="entries-section"
          aria-label="Reconciliation workspace"
        >
          <div className="workspace-toolbar">
            <ContentSwitcher
              size="md"
              selectedIndex={filters.findIndex(([value]) => value === filter)}
              onChange={({ index }) => {
                if (index !== undefined) setFilter(filters[index][0]);
              }}
              aria-label="Filter entries"
            >
              {filters.map(([value, label]) => (
                <Switch key={value} name={value} text={label} />
              ))}
            </ContentSwitcher>
            <Button
              kind="tertiary"
              size="md"
              renderIcon={Renew}
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
                  ? "Replay sample data"
                  : "Load sample data"}
            </Button>
          </div>
          <div
            className={
              selected ? "workspace-grid has-inspection" : "workspace-grid"
            }
          >
            <div className="ledger-area">
              {loading ? (
                <DataTableSkeleton
                  columnCount={7}
                  rowCount={6}
                  showHeader={false}
                  showToolbar={false}
                />
              ) : !visible.length ? (
                <div className="empty-state">
                  <h2>
                    {items.length
                      ? "No entries in this view."
                      : "No imported entries"}
                  </h2>
                  <p>
                    {items.length
                      ? "Choose another filter to see the other entries."
                      : "Load sample data to investigate partial payments, a bank fee and ambiguous references."}
                  </p>
                </div>
              ) : (
                <div
                  className="table-scroll"
                  tabIndex={0}
                  role="region"
                  aria-label="Reconciliation entries; scroll horizontally for all columns"
                >
                  <Table
                    size="md"

                    aria-label="Reconciliation entries"
                  >
                    <TableHead>
                      <TableRow>
                        <TableHeader>Reference</TableHeader>
                        <TableHeader>Entry</TableHeader>
                        <TableHeader>Source</TableHeader>
                        <TableHeader>Account</TableHeader>
                        <TableHeader className="numeric">Amount</TableHeader>
                        <TableHeader>Status</TableHeader>
                        <TableHeader>Action</TableHeader>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {visible.map((item) => (
                        <TableRow
                          key={item.entry.source + item.entry.id}
                          className={
                            selected?.entry.source === item.entry.source &&
                            selected?.entry.id === item.entry.id
                              ? "inspected-row"
                              : undefined
                          }
                        >
                          <TableCell>{item.entry.reference}</TableCell>
                          <TableCell className="identifier">
                            {item.entry.id}
                          </TableCell>
                          <TableCell>{item.entry.source}</TableCell>
                          <TableCell className="identifier">
                            {item.entry.account}
                          </TableCell>
                          <TableCell className="numeric amount">
                            {item.entry.currency}{" "}
                            {formatMoney(item.entry.amount)}
                          </TableCell>
                          <TableCell>
                            <Tag
                              size="sm"
                              type={
                                item.status === "matched"
                                  ? "green"
                                  : item.status === "reviewed"
                                    ? "blue"
                                    : item.status === "ambiguous"
                                      ? "warm-gray"
                                      : "cool-gray"
                              }
                            >
                              {item.status}
                            </Tag>
                          </TableCell>
                          <TableCell>
                            <Button
                              kind="ghost"
                              size="sm"
                              renderIcon={View}
                              aria-label={"Inspect " + item.entry.id}
                              onClick={(event) => {
                                inspectTrigger.current = event.currentTarget;
                                setSelected(item);
                                setReason("");
                              }}
                            >
                              Inspect
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              <div className="table-count">
                {visible.length} entries in this view
              </div>
            </div>
            {selected && (
              <section
                className="inspection"
                onKeyDown={(event) => {
                  if (event.key === "Escape") setSelected(null);
                }}
                aria-labelledby="inspection-title"
              >
                <div className="inspection-heading">
                  <h2 id="inspection-title" ref={inspectionTitle} tabIndex={-1}>
                    {selected.entry.reference}
                  </h2>
                  <Button
                    kind="ghost"
                    size="sm"
                    hasIconOnly
                    iconDescription="Close inspection"
                    renderIcon={Close}
                    onClick={() => setSelected(null)}
                  />
                </div>
                <dl className="entry-detail">
                  <dt>Entry</dt>
                  <dd>{selected.entry.id}</dd>
                  <dt>Source</dt>
                  <dd>{selected.entry.source}</dd>
                  <dt>Account</dt>
                  <dd>{selected.entry.account}</dd>
                  <dt>Currency</dt>
                  <dd>{selected.entry.currency}</dd>
                  <dt>Amount</dt>
                  <dd className="amount">
                    {formatMoney(selected.entry.amount)}
                  </dd>
                  <dt>Status</dt>
                  <dd>{selected.status}</dd>
                </dl>
                <div className="matching-evidence">
                  <h3>Matching evidence</h3>
                  <p>{selected.explanation}</p>
                  <p className="helper">
                    Rule-based explanation. No AI model involved.
                  </p>
                </div>
                {selected.reason && (
                  <div className="saved-review">
                    <h3>Review reason</h3>
                    <p>{selected.reason}</p>
                  </div>
                )}
                {["unmatched", "ambiguous"].includes(selected.status) ? (
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
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
                    <TextArea
                      id="reason"
                      name="reason"
                      autoComplete="off"
                      labelText="Investigation / resolution reason"
                      required
                      minLength={10}
                      maxLength={1000}
                      rows={4}
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      placeholder="What did you verify, and what happens next?"
                      helperText="10 to 1,000 characters. Record the evidence and next step."
                    />
                    <p className="helper review-boundary">
                      Reviewing acknowledges this exception. It does not match
                      entries or move money.
                    </p>
                    {error && (
                      <InlineNotification
                        kind="error"
                        lowContrast
                        hideCloseButton
                        title="Review not saved"
                        subtitle={error}
                      />
                    )}
                    <Button type="submit" size="md" disabled={busy}>
                      {busy ? "Saving…" : "Record review"}
                    </Button>
                  </form>
                ) : (
                  <Button
                    kind="tertiary"
                    size="md"
                    onClick={() => setSelected(null)}
                  >
                    Close inspection
                  </Button>
                )}
              </section>
            )}
          </div>
        </section>
        <section className="import-section" aria-labelledby="import-heading">
          <div>
            <h2 id="import-heading">Import a CSV batch</h2>
            <p>
              Identical replays are skipped. Conflicting IDs reject the entire
              batch.
            </p>
          </div>
          <div className="import-controls">
            <Select
              id="import-source"
              name="source"
              labelText="Source"
              value={source}
              onChange={(event) => setSource(event.target.value)}
              disabled={busy}
              size="md"
            >
              <SelectItem value="bank" text="Bank statement" />
              <SelectItem value="ledger" text="Ledger entries" />
            </Select>
            <FileUploaderButton
              name="csv"
              labelText="Choose CSV"
              accept={[".csv", "text/csv"]}
              disabled={busy || sandbox}
              size="md"
              buttonKind="primary"
              disableLabelChanges
              onChange={(event) => {
                const f = event.target.files?.[0];
                event.target.value = "";
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
          </div>
          <p className="csv-contract">
            <code>id,account,currency,amount,reference</code>
            <span>
              Up to 1,000 rows. ZAR, USD, EUR, GBP. Two decimal places.
            </span>
          </p>
          {sandbox && (
            <p className="helper">
              Custom CSV imports require the locally running Java backend. This
              sandbox uses predefined sample cases.
            </p>
          )}
        </section>
        <section
          id="activity"
          className="history-section"
          aria-labelledby="history-heading"
        >
          <div className="section-heading">
            <h2 id="history-heading">Review history</h2>
            <span>
              {history.length} recorded{" "}
              {history.length === 1 ? "review" : "reviews"}
            </span>
          </div>
          {!history.length ? (
            <p className="history-empty">
              No reviews yet. Inspect an open exception and record your
              investigation.
            </p>
          ) : (
            <div
              className="table-scroll"
              tabIndex={0}
              role="region"
              aria-label="Review history; scroll horizontally for all columns"
            >
              <Table size="md" aria-label="Review history">
                <TableHead>
                  <TableRow>
                    <TableHeader>Entry</TableHeader>
                    <TableHeader>Source</TableHeader>
                    <TableHeader>Reviewed by</TableHeader>
                    <TableHeader>Reviewed on</TableHeader>
                    <TableHeader>Reason</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {history.map((h) => (
                    <TableRow key={h.source + h.id}>
                      <TableCell className="identifier">{h.id}</TableCell>
                      <TableCell>{h.source}</TableCell>
                      <TableCell>{h.actor}</TableCell>
                      <TableCell>{new Date(h.at).toLocaleString()}</TableCell>
                      <TableCell className="review-text">{h.reason}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </section>
        {busy && (
          <InlineLoading
            description="Updating workspace…"
            className="request-progress"
          />
        )}
      </main>
    </Theme>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
