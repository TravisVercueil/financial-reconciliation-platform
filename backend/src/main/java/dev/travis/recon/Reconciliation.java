package dev.travis.recon;

import java.io.StringReader;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.apache.commons.csv.CSVFormat;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class Reconciliation {
  private final JdbcTemplate db;

  public Reconciliation(JdbcTemplate db) {
    this.db = db;
  }

  public record Entry(
      String source,
      String id,
      String account,
      String currency,
      @com.fasterxml.jackson.annotation.JsonFormat(
              shape = com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING)
          BigDecimal amount,
      String reference) {}

  public record Item(Entry entry, String status, String explanation, String reason) {}

  public record Imported(int inserted, int duplicates) {}

  public record Resolution(String source, String id, String reason, String actor, String at) {}

  public List<Entry> entries() {
    return db.query(
        "SELECT * FROM entries ORDER BY source, external_id",
        (r, n) ->
            new Entry(
                r.getString("source"),
                r.getString("external_id"),
                r.getString("account"),
                r.getString("currency"),
                r.getBigDecimal("amount"),
                r.getString("reference")));
  }

  private String key(Entry e) {
    return e.source + ":" + e.id;
  }

  private boolean sameMatch(Entry a, Entry b) {
    return a.account.equals(b.account)
        && a.currency.equals(b.currency)
        && a.amount.compareTo(b.amount) == 0
        && a.reference.equals(b.reference);
  }

  public List<Item> report() {
    List<Entry> all = entries();
    Map<String, String> resolved = new HashMap<>();
    history().forEach(r -> resolved.put(r.source + ":" + r.id, r.reason));
    return all.stream()
        .map(
            e -> {
              long other =
                  all.stream().filter(x -> !x.source.equals(e.source) && sameMatch(e, x)).count();
              long own =
                  all.stream().filter(x -> x.source.equals(e.source) && sameMatch(e, x)).count();
              String status =
                  other == 1 && own == 1 ? "matched" : other > 0 ? "ambiguous" : "unmatched";
              String explanation =
                  switch (status) {
                    case "matched" ->
                        "Unique counterpart with identical account, currency, amount and"
                            + " reference.";
                    case "ambiguous" ->
                        "Multiple candidates share this matching identity. No automatic match was"
                            + " selected.";
                    default ->
                        "No exact counterpart. Check the reference, amount, account and currency"
                            + " before resolving.";
                  };
              String reason = resolved.get(key(e));
              if (reason != null && !status.equals("matched")) status = "reviewed";
              return new Item(e, status, explanation, reason);
            })
        .toList();
  }

  @Transactional
  public Imported ingest(String source, String csv) {
    requireSource(source);
    if (csv == null || csv.length() > 200_000)
      throw new IllegalArgumentException("CSV must be at most 200 KB.");
    List<Entry> parsed = new ArrayList<>();
    try (var reader =
        CSVFormat.DEFAULT
            .builder()
            .setHeader()
            .setSkipHeaderRecord(true)
            .setIgnoreEmptyLines(true)
            .get()
            .parse(new StringReader(csv))) {
      if (!reader
          .getHeaderNames()
          .equals(List.of("id", "account", "currency", "amount", "reference")))
        throw new IllegalArgumentException(
            "Headers must be id,account,currency,amount,reference in that order.");
      for (var row : reader) {
        if (!row.isConsistent() || parsed.size() >= 1000)
          throw new IllegalArgumentException("Each row needs five fields; maximum 1,000 rows.");
        String id = field(row.get("id"), 80),
            account = field(row.get("account"), 80),
            currency = field(row.get("currency"), 3),
            reference = field(row.get("reference"), 120);
        if (!List.of("ZAR", "USD", "EUR", "GBP").contains(currency))
          throw new IllegalArgumentException(
              "Supported currencies: ZAR, USD, EUR, GBP (two decimal places).");
        String raw = row.get("amount").trim();
        if (!raw.matches("-?[0-9]{1,15}([.][0-9]{1,2})?"))
          throw new IllegalArgumentException(
              "Amounts need decimal notation with at most 15 whole digits and two decimal places.");
        parsed.add(
            new Entry(source, id, account, currency, new BigDecimal(raw).setScale(2), reference));
      }
    } catch (IllegalArgumentException e) {
      throw e;
    } catch (Exception e) {
      throw new IllegalArgumentException("Invalid CSV. Check quoting and fields.");
    }
    if (parsed.isEmpty()) throw new IllegalArgumentException("CSV contains no entries.");
    Map<String, Entry> known = new HashMap<>();
    entries().forEach(e -> known.put(key(e), e));
    List<Entry> additions = new ArrayList<>();
    int duplicate = 0;
    for (Entry e : parsed) {
      Entry existing = known.putIfAbsent(key(e), e);
      if (existing != null) {
        if (!existing.equals(e))
          throw new IllegalArgumentException(
              "Conflicting replay for " + key(e) + ". Entire import rejected.");
        duplicate++;
      } else additions.add(e);
    }
    additions.forEach(
        e ->
            db.update(
                "INSERT INTO entries(source,external_id,account,currency,amount,reference) VALUES"
                    + " (?,?,?,?,?,?)",
                e.source,
                e.id,
                e.account,
                e.currency,
                e.amount,
                e.reference));
    return new Imported(additions.size(), duplicate);
  }

  @Transactional
  public void resolve(String source, String id, String reason) {
    requireSource(source);
    reason = field(reason, 1000);
    if (reason.length() < 10)
      throw new IllegalArgumentException("Record a meaningful reason of at least 10 characters.");
    Item item =
        report().stream()
            .filter(i -> i.entry.source.equals(source) && i.entry.id.equals(id))
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException("Entry not found."));
    if (item.status.equals("matched") || item.status.equals("reviewed"))
      throw new IllegalArgumentException("Only open exceptions can be reviewed.");
    db.update(
        "INSERT INTO resolutions(source,external_id,reason,actor) VALUES (?,?,?,?)",
        source,
        id,
        reason,
        "Demo operator");
  }

  public List<Resolution> history() {
    return db.query(
        "SELECT * FROM resolutions ORDER BY resolved_at DESC",
        (r, n) ->
            new Resolution(
                r.getString("source"),
                r.getString("external_id"),
                r.getString("reason"),
                r.getString("actor"),
                r.getString("resolved_at")));
  }

  private static void requireSource(String source) {
    if (source == null || !List.of("ledger", "bank").contains(source))
      throw new IllegalArgumentException("Source must be ledger or bank.");
  }

  private static String field(String s, int max) {
    if (s == null || s.isBlank() || s.trim().length() > max)
      throw new IllegalArgumentException("Missing or oversized field.");
    return s.trim();
  }
}
