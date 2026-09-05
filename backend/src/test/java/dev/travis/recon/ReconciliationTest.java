package dev.travis.recon;

import static org.assertj.core.api.Assertions.*;

import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

@SpringBootTest(
    properties = {"spring.datasource.url=jdbc:h2:mem:test;MODE=PostgreSQL;DB_CLOSE_DELAY=-1"})
class ReconciliationTest {
  @Autowired Reconciliation service;
  @Autowired JdbcTemplate db;

  static String csv(String rows) {
    return "id,account,currency,amount,reference\n" + rows;
  }

  @BeforeEach
  void clear() {
    db.update("DELETE FROM resolutions");
    db.update("DELETE FROM entries");
  }

  @Test
  void exactMoneyAndSignedReversals() {
    service.ingest("ledger", csv("L,A,ZAR,-0.30,R"));
    service.ingest("bank", csv("B,A,ZAR,-0.30,R"));
    assertThat(service.report()).allMatch(x -> x.status().equals("matched"));
  }

  @Test
  void accountAndCurrencyAreBoundaries() {
    service.ingest("ledger", csv("L,A,ZAR,10,R"));
    service.ingest("bank", csv("B,B,ZAR,10,R\nC,A,USD,10,R"));
    assertThat(service.report()).allMatch(x -> x.status().equals("unmatched"));
  }

  @Test
  void identicalReplayIsSkipped() {
    String input = csv("L,A,ZAR,10.00,R\nL,A,ZAR,10.0,R");
    assertThat(service.ingest("ledger", input).inserted()).isEqualTo(1);
    assertThat(service.ingest("ledger", input).duplicates()).isEqualTo(2);
  }

  @Test
  void conflictingBatchIsAtomic() {
    service.ingest("ledger", csv("L,A,ZAR,10,R"));
    assertThatThrownBy(() -> service.ingest("ledger", csv("NEW,A,ZAR,20,X\nL,A,ZAR,11,R")))
        .isInstanceOf(IllegalArgumentException.class);
    assertThat(service.entries()).hasSize(1);
  }

  @Test
  void ambiguityNeverPicksFirst() {
    service.ingest("ledger", csv("L,A,ZAR,10,R\nM,A,ZAR,10,R"));
    service.ingest("bank", csv("B,A,ZAR,10,R"));
    assertThat(service.report()).allMatch(x -> x.status().equals("ambiguous"));
  }

  @Test
  void partialPaymentRemainsOpen() {
    service.ingest("ledger", csv("L,A,ZAR,10,R"));
    service.ingest("bank", csv("B,A,ZAR,9,R"));
    assertThat(service.report()).allMatch(x -> x.status().equals("unmatched"));
  }

  @Test
  void reasonIsPersistedButDoesNotMatch() {
    service.ingest("ledger", csv("L,A,ZAR,10,R"));
    service.resolve("ledger", "L", "Confirmed missing bank record; follow up tomorrow.");
    assertThat(service.report().getFirst().status()).isEqualTo("reviewed");
    assertThat(service.history()).hasSize(1);
    assertThatThrownBy(() -> service.resolve("ledger", "L", "Another review attempt."))
        .isInstanceOf(IllegalArgumentException.class);
  }

  @Test
  void rejectsInvalidPrecisionAndCurrency() {
    for (String row :
        new String[] {"L,A,ZAR,1.001,R", "L,A,JPY,10,R", "L,A,ZAR,1e2,R", "L,A,ZAR,10,"})
      assertThatThrownBy(() -> service.ingest("ledger", csv(row)))
          .isInstanceOf(IllegalArgumentException.class);
    assertThat(service.entries()).isEmpty();
  }

  @Test
  void quotedCsvAndHeaders() {
    service.ingest("ledger", csv("L,A,ZAR,10,\"Ref, with comma\""));
    assertThat(service.entries().getFirst().reference()).isEqualTo("Ref, with comma");
    assertThatThrownBy(
            () -> service.ingest("ledger", "id,id,currency,amount,reference\nL,A,ZAR,1,R"))
        .isInstanceOf(IllegalArgumentException.class);
  }

  @Test
  void matchedEntriesCannotBeReviewed() {
    service.ingest("ledger", csv("L,A,ZAR,1,R"));
    service.ingest("bank", csv("B,A,ZAR,1,R"));
    assertThatThrownBy(() -> service.resolve("ledger", "L", "Not a real exception."))
        .isInstanceOf(IllegalArgumentException.class);
  }

  @Test
  void concurrentReplaysNeverCreateDuplicates() throws Exception {
    try (var pool = java.util.concurrent.Executors.newFixedThreadPool(2)) {
      var barrier = new java.util.concurrent.CyclicBarrier(2);
      java.util.concurrent.Callable<Boolean> work =
          () -> {
            barrier.await();
            try {
              service.ingest("ledger", csv("L,A,ZAR,10,R"));
              return true;
            } catch (org.springframework.dao.DataIntegrityViolationException expected) {
              return false;
            }
          };
      var first = pool.submit(work);
      var second = pool.submit(work);
      boolean a = first.get(), b = second.get();
      assertThat(a || b).isTrue();
      assertThat(service.entries()).hasSize(1);
    }
  }

  @Test
  void concurrentReviewsCreateOneImmutableRecord() throws Exception {
    service.ingest("ledger", csv("L,A,ZAR,10,R"));
    try (var pool = java.util.concurrent.Executors.newFixedThreadPool(2)) {
      var barrier = new java.util.concurrent.CyclicBarrier(2);
      java.util.concurrent.Callable<Boolean> work =
          () -> {
            barrier.await();
            try {
              service.resolve("ledger", "L", "Verified exception; follow up required.");
              return true;
            } catch (org.springframework.dao.DataIntegrityViolationException
                | IllegalArgumentException expected) {
              return false;
            }
          };
      var first = pool.submit(work);
      var second = pool.submit(work);
      boolean a = first.get(), b = second.get();
      assertThat(a || b).isTrue();
      assertThat(service.history()).hasSize(1);
    }
  }
}
