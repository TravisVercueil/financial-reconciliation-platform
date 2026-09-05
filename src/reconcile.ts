export type Entry = {
  id: string;
  account: string;
  currency: string;
  reference: string;
  amountMinor: bigint;
};
export type Report = {
  matches: { ledgerId: string; bankId: string }[];
  unmatchedLedger: string[];
  unmatchedBank: string[];
};

function unique(entries: Entry[]): Entry[] {
  const seen = new Map<string, Entry>();
  for (const entry of entries) {
    if (![entry.id, entry.account, entry.reference].every(v => typeof v === "string" && v.trim().length > 0)
        || !/^[A-Z]{3}$/.test(entry.currency) || typeof entry.amountMinor !== "bigint") {
      throw new Error("Entries require an identity, account, reference, currency and integer minor units");
    }
    const previous = seen.get(entry.id);
    if (previous && (previous.account !== entry.account || previous.currency !== entry.currency
        || previous.reference !== entry.reference || previous.amountMinor !== entry.amountMinor)) {
      throw new Error(`Conflicting duplicate identity: ${entry.id}`);
    }
    seen.set(entry.id, entry);
  }
  return [...seen.values()].sort((a, b) => a.id.localeCompare(b.id));
}

// Exact, one-to-one matching only. Partial payments, fees and ambiguous
// candidates are deliberately left unresolved for later review workflows.
export function reconcile(ledgerInput: Entry[], bankInput: Entry[]): Report {
  const ledger = unique(ledgerInput);
  const bank = unique(bankInput);
  const key = (entry: Entry) => JSON.stringify([
    entry.account, entry.currency, entry.reference, entry.amountMinor.toString()
  ]);
  function group(entries: Entry[]) {
    const groups = new Map<string, Entry[]>();
    for (const entry of entries) {
      const k = key(entry);
      const bucket = groups.get(k) ?? [];
      bucket.push(entry);
      groups.set(k, bucket);
    }
    return groups;
  }
  const left = group(ledger);
  const right = group(bank);
  const matches: Report["matches"] = [];
  for (const [k, candidates] of left) {
    const counterparts = right.get(k);
    if (candidates.length === 1 && counterparts?.length === 1) {
      matches.push({ ledgerId: candidates[0].id, bankId: counterparts[0].id });
    }
  }
  const matchedLedger = new Set(matches.map(m => m.ledgerId));
  const matchedBank = new Set(matches.map(m => m.bankId));
  return {
    matches,
    unmatchedLedger: ledger.filter(e => !matchedLedger.has(e.id)).map(e => e.id),
    unmatchedBank: bank.filter(e => !matchedBank.has(e.id)).map(e => e.id),
  };
}
