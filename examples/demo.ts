import { reconcile, type Entry } from "../src/reconcile.ts";
const base = { account: "synthetic-demo", currency: "ZAR" };
const ledger: Entry[] = [
  { ...base, id: "invoice-1", reference: "INV-001", amountMinor: 12500n },
  { ...base, id: "invoice-2", reference: "INV-002", amountMinor: 20000n },
];
const bank: Entry[] = [
  { ...base, id: "payment-1", reference: "INV-001", amountMinor: 12500n },
  { ...base, id: "payment-1", reference: "INV-001", amountMinor: 12500n },
  { ...base, id: "payment-2", reference: "INV-002", amountMinor: 10000n },
  { ...base, id: "payment-3", reference: "UNKNOWN", amountMinor: 500n },
];
console.log(JSON.stringify(reconcile(ledger, bank), null, 2));
