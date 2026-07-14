import type { Pool } from "../src/index.js";

/**
 * Seeds a single row into `tenants` via the admin connection.
 *
 * `tenants` has no RLS and the app role has no access to it, so every
 * integration test that needs a tenant to exist before exercising
 * RLS-scoped tables must insert it through the admin (superuser) pool.
 * Shared here instead of copy-pasted per test file.
 */
export async function seedTenant(
  adminPool: Pool,
  id: string,
  name = "Clinic A",
): Promise<void> {
  const client = await adminPool.connect();
  try {
    await client.query("INSERT INTO tenants (id, name) VALUES ($1, $2)", [
      id,
      name,
    ]);
  } finally {
    client.release();
  }
}
