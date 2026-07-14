import { describe, expect, test } from "vitest";
import { sanitizeAuditEntry } from "../src/index.js";

// GAP-DOCUMENTING TEST — DO NOT "FIX" BY EDITING sanitizeAuditEntry.
//
// sanitizeAuditEntry only whitelists KEYS (see ALLOWED_KEYS in ../src/index.ts).
// It never inspects the CONTENT of an allowed field's value. That means a
// caller can put a PHI-shaped value — a full patient name, an SSN-looking
// string, a DOB — into `entityId` (or `entity`/`actor`) and it sails straight
// through into the append-only, exportable audit_logs table unredacted.
//
// This is intentionally written with test.fails(): the inner assertion states
// what SHOULD happen (value-level PHI detection should reject or redact the
// entry), which is currently FALSE, so the assertion throws and test.fails()
// reports that as a passing "expected failure." If sanitizeAuditEntry is ever
// given value-level PHI scanning, this test starts passing internally, which
// makes test.fails() itself report a FAILURE — a visible signal to come back
// and flip this to a normal `test`.
describe("sanitizeAuditEntry — value-content PHI gap (known, unfixed)", () => {
  test.fails("SSN-shaped string in entityId is NOT redacted or rejected (should be)", () => {
    const ssnShaped = "078-05-1120"; // classic SSN format
    const result = sanitizeAuditEntry({
      actor: "user-1",
      action: "read",
      entity: "claim",
      entityId: ssnShaped,
    });

    // What SHOULD happen: value-level PHI detection should have caught the
    // SSN-shaped entityId and either redacted it or thrown. Today it does
    // neither — the guard only checks keys, not value content — so this
    // assertion fails, and test.fails() turns that failure into a pass,
    // documenting the gap without touching source.
    expect(result.entityId).not.toBe(ssnShaped);
  });

  test.fails("full-name-shaped string in entityId is NOT redacted or rejected (should be)", () => {
    const patientNameShaped = "Ahmed Abdullah Al-Rashid";
    const result = sanitizeAuditEntry({
      actor: "user-1",
      action: "read",
      entity: "patient",
      entityId: patientNameShaped,
    });

    // Same gap as above, exercised with a full-name-shaped value instead of
    // an SSN-shaped one, to show the hole isn't format-specific.
    expect(result.entityId).not.toBe(patientNameShaped);
  });
});
