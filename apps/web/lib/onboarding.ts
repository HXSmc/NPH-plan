import "server-only";
import { getLatestBaseline } from "@taweed/analytics";
import { withSession } from "./db";

/**
 * A2 first-run corridor gate. A tenant counts as onboarded once it has
 * captured its recovery baseline (EXECUTE B8, `recovery_baselines`) — that
 * capture happens exactly once, at the end of the corridor's upload step, so
 * its presence is an honest, additive signal: no new migration, no flag that
 * can drift out of sync with reality.
 */
export function isOnboarded(tenantId: string): Promise<boolean> {
  return withSession(tenantId, async (db) => (await getLatestBaseline(db)) !== null);
}
