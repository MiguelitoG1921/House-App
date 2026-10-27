import postgres from "postgres";

declare global {
  // eslint-disable-next-line no-var
  var greenhouseSql: ReturnType<typeof postgres> | undefined;
  // eslint-disable-next-line no-var
  var greenhouseSchema: Promise<void> | undefined;
}

function sqlClient() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not configured.");
  globalThis.greenhouseSql ??= postgres(url, { prepare: false, max: 4, idle_timeout: 20, connect_timeout: 10 });
  return globalThis.greenhouseSql;
}

async function ensureSchema() {
  const sql = sqlClient();
  globalThis.greenhouseSchema ??= sql`
    CREATE TABLE IF NOT EXISTS greenhouse_household_state (
      household text PRIMARY KEY,
      state jsonb NOT NULL DEFAULT '{}'::jsonb,
      revision bigint NOT NULL DEFAULT 1,
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `.then(() => undefined);
  await globalThis.greenhouseSchema;
  return sql;
}

export type HouseholdSnapshot = {
  items: unknown[];
  catalogOnly: unknown[];
  purchasedItems: unknown[];
  deletedCatalogNames: string[];
  stores: string[];
  comments: { id: string; author: string; body: string; createdAt: string }[];
};

export async function readHousehold() {
  const sql = await ensureSchema();
  const rows = await sql<{ state: HouseholdSnapshot; revision: string }[]>`
    SELECT state, revision::text FROM greenhouse_household_state WHERE household = 'greenhouse'
  `;
  if (rows[0]) return { state: rows[0].state, revision: Number(rows[0].revision), initialized: true };
  return { state: null, revision: 0, initialized: false };
}

export async function writeHousehold(state: HouseholdSnapshot, expectedRevision: number) {
  const sql = await ensureSchema();
  return sql.begin(async (tx) => {
    if (expectedRevision === 0) {
      const inserted = await tx<{ revision: string }[]>`
        INSERT INTO greenhouse_household_state (household, state, revision, updated_at)
        VALUES ('greenhouse', ${tx.json(JSON.parse(JSON.stringify(state)))}, 1, now())
        ON CONFLICT (household) DO NOTHING
        RETURNING revision::text
      `;
      if (inserted[0]) return { ok: true as const, revision: 1 };
    } else {
      const updated = await tx<{ revision: string }[]>`
        UPDATE greenhouse_household_state
        SET state = ${tx.json(JSON.parse(JSON.stringify(state)))}, revision = revision + 1, updated_at = now()
        WHERE household = 'greenhouse' AND revision = ${expectedRevision}
        RETURNING revision::text
      `;
      if (updated[0]) return { ok: true as const, revision: Number(updated[0].revision) };
    }
    const rows = await tx<{ state: HouseholdSnapshot; revision: string }[]>`
      SELECT state, revision::text FROM greenhouse_household_state WHERE household = 'greenhouse'
    `;
    return { ok: false as const, state: rows[0]?.state ?? null, revision: Number(rows[0]?.revision ?? 0) };
  });
}
