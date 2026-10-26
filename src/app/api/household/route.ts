import { hasHouseholdAccess } from "@/lib/household-access";
import { readHousehold, writeHousehold, type HouseholdSnapshot } from "@/lib/household-db";

function validSnapshot(value: unknown): value is HouseholdSnapshot {
  if (!value || typeof value !== "object") return false;
  const state = value as Record<string, unknown>;
  return Array.isArray(state.items)
    && Array.isArray(state.catalogOnly)
    && Array.isArray(state.purchasedItems)
    && Array.isArray(state.deletedCatalogNames)
    && state.items.length <= 5000
    && state.catalogOnly.length <= 5000
    && state.purchasedItems.length <= 5000
    && state.deletedCatalogNames.length <= 5000;
}

export async function GET() {
  if (!await hasHouseholdAccess()) return Response.json({ error: "Sign in to the household first." }, { status: 401 });
  try {
    return Response.json(await readHousehold(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Household sync read failed", error);
    return Response.json({ error: "Could not reach the household database." }, { status: 503 });
  }
}

export async function PUT(request: Request) {
  if (!await hasHouseholdAccess()) return Response.json({ error: "Sign in to the household first." }, { status: 401 });
  try {
    const body = await request.json() as { state?: unknown; revision?: unknown };
    if (!validSnapshot(body.state) || !Number.isSafeInteger(body.revision) || Number(body.revision) < 0) {
      return Response.json({ error: "The household update was incomplete." }, { status: 400 });
    }
    const result = await writeHousehold(body.state, Number(body.revision));
    return Response.json(result, { status: result.ok ? 200 : 409, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Household sync write failed", error);
    return Response.json({ error: "Could not save to the household database." }, { status: 503 });
  }
}
