"""Exercises the real HTTP API without external Python packages. Uses synthetic fixtures."""
import json
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError

BASE = "http://127.0.0.1:8101/api"
ROOT = Path(__file__).resolve().parent.parent

def request(path, body=None, content_type="application/json"):
    data = body.encode() if body is not None else None
    with urlopen(Request(BASE + path, data=data, headers={"Content-Type": content_type})) as response:
        text = response.read()
        return json.loads(text) if text else None

assert request("/health")["status"] == "ok"
for source in ("ledger", "bank"):
    csv = (ROOT / "fixtures" / (source + ".csv")).read_text()
    request("/imports/" + source, csv, "text/csv")
    assert request("/imports/" + source, csv, "text/csv") == {"inserted": 0, "duplicates": 6}
report = request("/report")
assert len(report) == 12
assert sum(item["status"] == "matched" for item in report) == 6
assert all(isinstance(item["entry"]["amount"], str) for item in report)
try:
    request("/imports/bank", "id,account,currency,amount,reference\nNEW,OPERATING-ZAR,ZAR,5,NEW\nB-901,OPERATING-ZAR,ZAR,1,INV-2401", "text/csv")
    raise AssertionError("Conflicting replay should fail")
except HTTPError as error:
    assert error.code == 400
assert len(request("/report")) == 12
if not any(item["id"] == "B-902" for item in request("/history")):
    request("/resolutions", json.dumps({"source": "bank", "id": "B-902", "reason": "Verified partial payment; follow up on remaining ZAR 400."}))
assert any(item["id"] == "B-902" for item in request("/history"))
assert next(item for item in request("/report") if item["entry"]["id"] == "B-902")["status"] == "reviewed"
print("HTTP smoke passed: imports, replay, matching, conflict atomicity, decimal serialization, review history.")
