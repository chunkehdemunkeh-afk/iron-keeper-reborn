// Supabase client interceptor for Demo Mode.
//
// When sessionStorage has the demo flag set, supabase.from(table) is rerouted
// to query/mutate the in-memory demo store instead of hitting the backend.
// The interceptor implements the small subset of the PostgREST query builder
// the app actually uses: select / insert / update / upsert / delete with
// operators eq, in, gte, lte, not, order, limit, single, maybeSingle.

import { supabase as realClient } from "@/integrations/supabase/client";
import { isDemoMode } from "@/lib/demo-mode";
import { getDemoStore, demoInsert, demoUpdate, demoDelete } from "@/lib/demo-data";

type Filter = { type: "eq" | "in" | "gte" | "lte" | "not"; col: string; val: any; op?: string };

function applyFilters(rows: any[], filters: Filter[]): any[] {
  return rows.filter((row) => {
    for (const f of filters) {
      const v = row[f.col];
      switch (f.type) {
        case "eq":
          if (v !== f.val) return false;
          break;
        case "in":
          if (!Array.isArray(f.val) || !f.val.includes(v)) return false;
          break;
        case "gte":
          if (!(v >= f.val)) return false;
          break;
        case "lte":
          if (!(v <= f.val)) return false;
          break;
        case "not":
          if (f.op === "is" && f.val === null) {
            if (v === null || v === undefined) return false;
          }
          break;
      }
    }
    return true;
  });
}

function makeBuilder(table: string) {
  const store = getDemoStore() as any;
  let filters: Filter[] = [];
  let mode: "select" | "insert" | "update" | "upsert" | "delete" = "select";
  let payload: any = null;
  let upsertOpts: any = null;
  let orderCol: string | null = null;
  let orderAsc = true;
  let limitN: number | null = null;
  let returnSelected = false;

  const exec = async () => {
    const tableRows: any[] = store[table] || [];

    try {
      if (mode === "select") {
        let rows = applyFilters(tableRows, filters);
        if (orderCol) {
          rows = [...rows].sort((a, b) => {
            const av = a[orderCol!];
            const bv = b[orderCol!];
            if (av === bv) return 0;
            return (av > bv ? 1 : -1) * (orderAsc ? 1 : -1);
          });
        }
        if (limitN !== null) rows = rows.slice(0, limitN);
        return { data: rows, error: null };
      }

      if (mode === "insert" || mode === "upsert") {
        const items = Array.isArray(payload) ? payload : [payload];
        const inserted: any[] = [];
        for (const item of items) {
          if (mode === "upsert" && upsertOpts?.onConflict) {
            const cols = String(upsertOpts.onConflict).split(",").map((c: string) => c.trim());
            const existingIdx = tableRows.findIndex((r) => cols.every((c) => r[c] === item[c]));
            if (existingIdx !== -1) {
              Object.assign(tableRows[existingIdx], item);
              inserted.push(tableRows[existingIdx]);
              continue;
            }
          }
          const row = demoInsert(table as any, item);
          inserted.push(row);
        }
        return { data: returnSelected ? inserted : null, error: null };
      }

      if (mode === "update") {
        demoUpdate(table as any, (row) => applyFilters([row], filters).length > 0, payload);
        return { data: null, error: null };
      }

      if (mode === "delete") {
        demoDelete(table as any, (row) => applyFilters([row], filters).length > 0);
        return { data: null, error: null };
      }

      return { data: null, error: null };
    } catch (e: any) {
      return { data: null, error: { message: String(e?.message ?? e) } };
    }
  };

  const builder: any = {
    select(_cols?: string, opts?: any) {
      if (mode === "insert" || mode === "upsert" || mode === "update" || mode === "delete") {
        returnSelected = true;
      }
      return builder;
    },
    insert(values: any) { mode = "insert"; payload = values; return builder; },
    upsert(values: any, opts?: any) { mode = "upsert"; payload = values; upsertOpts = opts; return builder; },
    update(values: any) { mode = "update"; payload = values; return builder; },
    delete() { mode = "delete"; return builder; },
    eq(col: string, val: any) { filters.push({ type: "eq", col, val }); return builder; },
    in(col: string, val: any[]) { filters.push({ type: "in", col, val }); return builder; },
    gte(col: string, val: any) { filters.push({ type: "gte", col, val }); return builder; },
    lte(col: string, val: any) { filters.push({ type: "lte", col, val }); return builder; },
    not(col: string, op: string, val: any) { filters.push({ type: "not", col, val, op }); return builder; },
    order(col: string, opts?: { ascending?: boolean }) {
      orderCol = col;
      orderAsc = opts?.ascending !== false;
      return builder;
    },
    limit(n: number) { limitN = n; return builder; },
    async single() {
      const { data, error } = await exec();
      if (error) return { data: null, error };
      if (!data || (Array.isArray(data) && data.length === 0)) {
        return { data: null, error: { message: "No rows", code: "PGRST116" } };
      }
      return { data: Array.isArray(data) ? data[0] : data, error: null };
    },
    async maybeSingle() {
      const { data, error } = await exec();
      if (error) return { data: null, error };
      const row = Array.isArray(data) ? (data[0] ?? null) : data;
      return { data: row, error: null };
    },
    then(onFulfilled: any, onRejected?: any) {
      return exec().then(onFulfilled, onRejected);
    },
  };
  return builder;
}

// Wrap supabase.from() — only the from() method is intercepted.
// Auth, storage, functions etc. fall through to the real client.
const originalFrom = realClient.from.bind(realClient);

(realClient as any).from = function (table: string) {
  if (isDemoMode()) {
    return makeBuilder(table);
  }
  return originalFrom(table as any);
};

// Re-export so consumers that import from the wrapper file can opt in if needed.
export { realClient as supabase };
