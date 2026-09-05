import test from "node:test";
import assert from "node:assert/strict";
import { reconcile, type Entry } from "../src/reconcile.ts";
const entry = (id: string, overrides: Partial<Entry> = {}): Entry => ({
  id, account: "demo-account", currency: "ZAR", reference: "invoice-1", amountMinor: 10000n, ...overrides
});
test("matches exact values without floating point rounding", () => {
  const amountMinor = 900719925474099312345n;
  assert.deepEqual(reconcile([entry("l", { amountMinor })], [entry("b", { amountMinor })]).matches,
    [{ ledgerId: "l", bankId: "b" }]);
});
test("deduplicates identical deliveries and rejects conflicting identities", () => {
  assert.equal(reconcile([entry("l")], [entry("b"), entry("b")]).matches.length, 1);
  assert.throws(() => reconcile([], [entry("b"), entry("b", { amountMinor: 1n })]), /Conflicting/);
});
test("never resolves ambiguous candidates by input order", () => {
  const result = reconcile([entry("l")], [entry("b2"), entry("b1")]);
  assert.deepEqual(result, { matches: [], unmatchedLedger: ["l"], unmatchedBank: ["b1", "b2"] });
  assert.deepEqual(result, reconcile([entry("l")], [entry("b1"), entry("b2")]));
});
test("never crosses account, currency, reference or amount boundaries", () => {
  for (const change of [{ account: "other" }, { currency: "USD" }, { reference: "invoice-2" }, { amountMinor: 9999n }]) {
    assert.equal(reconcile([entry("l")], [entry("b", change)]).matches.length, 0);
  }
});
test("leaves partial payments unresolved", () => {
  const result = reconcile([entry("l")], [entry("b1", { amountMinor: 6000n }), entry("b2", { amountMinor: 4000n })]);
  assert.equal(result.matches.length, 0);
  assert.equal(result.unmatchedBank.length, 2);
});
test("rejects malformed input rather than silently coercing money", () => {
  assert.throws(() => reconcile([entry(" ")], []), /Entries require/);
  assert.throws(() => reconcile([entry("l", { amountMinor: 10 as unknown as bigint })], []), /Entries require/);
});
