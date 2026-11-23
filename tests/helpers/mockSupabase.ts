import { randomUUID } from "crypto";
import type { SupabaseAdminLike } from "@/lib/supabase/blueprintSession";

type Row = Record<string, unknown>;

type FilterFn = (row: Row) => boolean;

class InMemoryQueryBuilder {
  private filters: FilterFn[] = [];
  private limitCount: number | null = null;
  private mode: "select" | "insert" | "upsert" | "update" | "delete" = "select";
  private payload: Row | null = null;
  private insertPayloads: Row[] = [];
  private onConflictCol: string | null = null;
  private returnSingle: "single" | "maybeSingle" | null = null;

  constructor(
    private readonly rows: Row[],
    private readonly tableName: string
  ) {}

  select(_columns?: string) {
    if (this.mode === "select") {
      this.mode = "select";
    }
    return this;
  }

  upsert(row: Row, opts?: { onConflict?: string }) {
    this.mode = "upsert";
    this.payload = { ...row };
    this.onConflictCol = opts?.onConflict ?? "id";
    return this;
  }

  insert(rowOrRows: Row | Row[]) {
    this.mode = "insert";
    const list = Array.isArray(rowOrRows) ? rowOrRows : [rowOrRows];
    this.insertPayloads = list.map((r) => ({ ...r }));
    return this;
  }

  update(patch: Row) {
    this.mode = "update";
    this.payload = { ...patch };
    return this;
  }

  delete() {
    this.mode = "delete";
    return this;
  }

  eq(col: string, val: unknown) {
    this.filters.push((row) => row[col] === val);
    return this;
  }

  is(col: string, val: unknown) {
    this.filters.push((row) => (row[col] ?? null) === val);
    return this;
  }

  not(col: string, op: string, val: unknown) {
    if (op === "is" && val === null) {
      this.filters.push((row) => row[col] !== null && row[col] !== undefined);
    }
    return this;
  }

  gte(col: string, val: number | string) {
    if (typeof val === "string") {
      this.filters.push((row) => String(row[col] ?? "") >= val);
    } else {
      this.filters.push((row) => Number(row[col]) >= val);
    }
    return this;
  }

  lte(col: string, val: number | string) {
    if (typeof val === "string") {
      this.filters.push((row) => String(row[col] ?? "") <= val);
    } else {
      this.filters.push((row) => Number(row[col]) <= val);
    }
    return this;
  }

  limit(n: number) {
    this.limitCount = n;
    return this;
  }

  single<T = Row>() {
    this.returnSingle = "single";
    return this.execute<T>();
  }

  maybeSingle<T = Row>() {
    this.returnSingle = "maybeSingle";
    return this.execute<T>();
  }

  then<TResult1 = unknown, TResult2 = never>(
    onfulfilled?:
      | ((value: {
          data: Row[];
          error: { code?: string; message?: string } | null;
        }) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ) {
    return this.execute().then(onfulfilled, onrejected);
  }

  private async execute<T = Row[]>(): Promise<{
    data: T;
    error: { code?: string; message?: string } | null;
  }> {
    if (this.mode === "insert") {
      const now = new Date().toISOString();
      const inserted = this.insertPayloads.map((item) => {
        const saved: Row = {
          id: randomUUID(),
          created_at: now,
          ...item,
        };
        this.rows.push(saved);
        return structuredClone(saved);
      });
      if (this.returnSingle) {
        return { data: (inserted[0] ?? null) as T, error: null };
      }
      return { data: inserted as unknown as T, error: null };
    }

    if (this.mode === "upsert" && this.payload) {
      const conflictCols = (this.onConflictCol || "id")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const existingIdx = this.rows.findIndex((r) =>
        conflictCols.every(
          (col) =>
            this.payload![col] !== undefined && r[col] === this.payload![col]
        )
      );

      let saved: Row;
      const now = new Date().toISOString();
      if (existingIdx >= 0) {
        saved = {
          ...this.rows[existingIdx],
          ...this.payload,
          updated_at: now,
        };
        this.rows[existingIdx] = saved;
      } else {
        saved = {
          id: randomUUID(),
          is_paid: this.tableName === "blueprints" ? false : undefined,
          unlock_tier: null,
          accuracy_feedback: null,
          created_at: now,
          updated_at: now,
          ...this.payload,
        };
        this.rows.push(saved);
      }

      if (this.returnSingle) {
        return { data: structuredClone(saved) as T, error: null };
      }
      return { data: [structuredClone(saved)] as unknown as T, error: null };
    }

    const matchingIndices: number[] = [];
    this.rows.forEach((row, idx) => {
      if (this.filters.every((fn) => fn(row))) {
        matchingIndices.push(idx);
      }
    });

    if (this.mode === "update" && this.payload) {
      const updatedRows: Row[] = [];
      for (const idx of matchingIndices) {
        this.rows[idx] = {
          ...this.rows[idx],
          ...this.payload,
          updated_at: new Date().toISOString(),
        };
        updatedRows.push(structuredClone(this.rows[idx]));
      }
      if (this.returnSingle === "maybeSingle") {
        return { data: (updatedRows[0] ?? null) as T, error: null };
      }
      if (this.returnSingle === "single") {
        return {
          data: (updatedRows[0] ?? null) as T,
          error: updatedRows[0] ? null : { message: "Row not found" },
        };
      }
      return { data: updatedRows as unknown as T, error: null };
    }

    if (this.mode === "delete") {
      const deleted: Row[] = [];
      for (let i = matchingIndices.length - 1; i >= 0; i--) {
        const [removed] = this.rows.splice(matchingIndices[i], 1);
        deleted.push(structuredClone(removed));
      }
      return { data: deleted as unknown as T, error: null };
    }

    let result = matchingIndices.map((idx) => structuredClone(this.rows[idx]));
    if (this.limitCount !== null) {
      result = result.slice(0, this.limitCount);
    }

    if (this.returnSingle === "maybeSingle") {
      return { data: (result[0] ?? null) as T, error: null };
    }
    if (this.returnSingle === "single") {
      return {
        data: (result[0] ?? null) as T,
        error: result[0] ? null : { message: "Row not found" },
      };
    }

    return { data: result as unknown as T, error: null };
  }
}

export class InMemorySupabaseAdmin {
  public readonly tables: Record<string, Row[]> = {
    natal_charts: [],
    blueprints: [],
    profiles: [],
    funnel_events: [],
    daily_checkins: [],
    decision_logs: [],
  };

  from(table: string) {
    if (!this.tables[table]) {
      this.tables[table] = [];
    }
    return new InMemoryQueryBuilder(this.tables[table], table);
  }

  asAdminClient(): SupabaseAdminLike {
    return this as unknown as SupabaseAdminLike;
  }
}
