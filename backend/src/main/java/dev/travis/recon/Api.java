package dev.travis.recon;

import java.util.List;
import java.util.Map;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class Api {
  private final Reconciliation service;

  public Api(Reconciliation service) {
    this.service = service;
  }

  @GetMapping("/report")
  public List<Reconciliation.Item> report() {
    return service.report();
  }

  @GetMapping("/history")
  public List<Reconciliation.Resolution> history() {
    return service.history();
  }

  @GetMapping("/health")
  public Map<String, String> health() {
    return Map.of("status", "ok");
  }

  @PostMapping(value = "/imports/{source}", consumes = "text/csv")
  public Reconciliation.Imported upload(@PathVariable String source, @RequestBody String csv) {
    return service.ingest(source, csv);
  }

  public record Review(String source, String id, String reason) {}

  @PostMapping("/resolutions")
  public ResponseEntity<Void> resolve(@RequestBody Review review) {
    service.resolve(review.source, review.id, review.reason);
    return ResponseEntity.noContent().build();
  }

  @ExceptionHandler(IllegalArgumentException.class)
  public ResponseEntity<Map<String, String>> invalid(IllegalArgumentException e) {
    return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
  }

  @ExceptionHandler(DataIntegrityViolationException.class)
  public ResponseEntity<Map<String, String>> conflict() {
    return ResponseEntity.status(409)
        .body(
            Map.of(
                "message",
                "Another request changed this record. Refresh and retry; no partial import was"
                    + " saved."));
  }
}
