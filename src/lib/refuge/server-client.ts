import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isSqliteRefugeMode } from "@/lib/refuge/mode";
import {
    appendRefugeJournal,
    listRefugeRows,
    writeRefugeRows,
} from "@/lib/refuge/store";
import {
    getRefugeIdentity,
    isRefugeQueryableTable,
    refugeTableHasColumn,
    type RefugeRow,
} from "@/lib/refuge/schema";

type QueryError = { message: string };
type QueryResponse<T> = {
    data: T | null;
    error: QueryError | null;
    count?: number | null;
};
type FilterOperator =
    | "eq"
    | "neq"
    | "lt"
    | "gt"
    | "in"
    | "contains"
    | "ilike"
    | "is"
    | "not";
type Filter = { column: string; operator: FilterOperator; value: unknown };
type OrFilter = { column: string; operator: "eq" | "is"; value: unknown };
type OrderRule = { column: string; ascending: boolean };
type SelectOptions = { count?: "exact" | null; head?: boolean };
type MaybePromise<T> = PromiseLike<T>;
type RealServerClient = SupabaseClient | null;

type QueryMode = "select" | "insert" | "update" | "upsert" | "delete";

function getValue(row: RefugeRow, column: string): unknown {
    return row[column];
}

function valuesEqual(actual: unknown, expected: unknown): boolean {
    if (Array.isArray(actual)) return actual.includes(expected);
    return actual === expected;
}

function compareValues(actual: unknown, expected: unknown): number {
    return String(actual ?? "").localeCompare(String(expected ?? ""));
}

function likeToRegExp(pattern: string): RegExp {
    const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&");
    const source = escaped.replace(/%/g, ".*").replace(/_/g, ".");
    return new RegExp(`^${source}$`, "i");
}

function matchesFilter(row: RefugeRow, filter: Filter): boolean {
    const actual = getValue(row, filter.column);
    switch (filter.operator) {
        case "eq":
            return valuesEqual(actual, filter.value);
        case "neq":
            return !valuesEqual(actual, filter.value);
        case "lt":
            return compareValues(actual, filter.value) < 0;
        case "gt":
            return compareValues(actual, filter.value) > 0;
        case "in":
            return Array.isArray(filter.value) && filter.value.includes(actual);
        case "contains":
            return Array.isArray(actual) && Array.isArray(filter.value)
                ? filter.value.every((value) => actual.includes(value))
                : false;
        case "ilike":
            return likeToRegExp(String(filter.value)).test(
                String(actual ?? "")
            );
        case "is":
            return filter.value === null
                ? actual == null
                : actual === filter.value;
        case "not": {
            const value = filter.value as { operator: string; value: unknown };
            if (value.operator === "is") {
                return value.value === null
                    ? actual != null
                    : actual !== value.value;
            }
            return !valuesEqual(actual, value.value);
        }
    }
}

function parseOrFilter(raw: string): OrFilter[] {
    return raw
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean)
        .flatMap((part): OrFilter[] => {
            const eqMatch = part.match(/^([a-zA-Z0-9_]+)\.eq\.(.+)$/);
            if (eqMatch) {
                return [
                    { column: eqMatch[1]!, operator: "eq", value: eqMatch[2]! },
                ];
            }
            const isNullMatch = part.match(/^([a-zA-Z0-9_]+)\.is\.null$/);
            if (isNullMatch) {
                return [
                    { column: isNullMatch[1]!, operator: "is", value: null },
                ];
            }
            return [];
        });
}

function matchesOrFilter(row: RefugeRow, filters: OrFilter[]): boolean {
    if (filters.length === 0) return true;
    return filters.some((filter) =>
        matchesFilter(row, {
            column: filter.column,
            operator: filter.operator,
            value: filter.value,
        })
    );
}

function projectRow(row: RefugeRow, selectFields: string | null): RefugeRow {
    if (!selectFields || selectFields.trim() === "*") return { ...row };
    const fields = selectFields
        .split(",")
        .map((field) => field.trim())
        .filter(Boolean);
    const projected: RefugeRow = {};
    for (const field of fields) {
        const clean = field.split(":").at(-1)?.trim() ?? field;
        projected[clean] = row[clean];
    }
    return projected;
}

function applyOrdering(rows: RefugeRow[], orders: OrderRule[]): RefugeRow[] {
    return [...rows].sort((a, b) => {
        for (const order of orders) {
            const result = compareValues(a[order.column], b[order.column]);
            if (result !== 0) return order.ascending ? result : -result;
        }
        return 0;
    });
}

class RefugeQueryBuilder implements MaybePromise<QueryResponse<unknown>> {
    private mode: QueryMode = "select";
    private selectedFields: string | null = null;
    private selectOptions: SelectOptions = {};
    private filters: Filter[] = [];
    private orFilters: OrFilter[][] = [];
    private orders: OrderRule[] = [];
    private rowLimit: number | null = null;
    private rangeStart: number | null = null;
    private rangeEnd: number | null = null;
    private singleResult = false;
    private maybeSingleResult = false;
    private payload: RefugeRow | RefugeRow[] | null = null;
    private onConflict: string | null = null;

    constructor(
        private readonly table: string,
        private readonly unavailableMessage: string | null = null
    ) {}

    select(fields = "*", options: SelectOptions = {}): this {
        this.selectedFields = fields;
        this.selectOptions = options;
        return this;
    }

    insert(payload: RefugeRow | RefugeRow[]): this {
        this.mode = "insert";
        this.payload = payload;
        return this;
    }

    update(payload: RefugeRow): this {
        this.mode = "update";
        this.payload = payload;
        return this;
    }

    upsert(
        payload: RefugeRow | RefugeRow[],
        options: { onConflict?: string } = {}
    ): this {
        this.mode = "upsert";
        this.payload = payload;
        this.onConflict = options.onConflict ?? null;
        return this;
    }

    delete(): this {
        this.mode = "delete";
        return this;
    }

    eq(column: string, value: unknown): this {
        this.filters.push({ column, operator: "eq", value });
        return this;
    }

    neq(column: string, value: unknown): this {
        this.filters.push({ column, operator: "neq", value });
        return this;
    }

    lt(column: string, value: unknown): this {
        this.filters.push({ column, operator: "lt", value });
        return this;
    }

    gt(column: string, value: unknown): this {
        this.filters.push({ column, operator: "gt", value });
        return this;
    }

    in(column: string, values: unknown[]): this {
        this.filters.push({ column, operator: "in", value: values });
        return this;
    }

    contains(column: string, values: unknown[]): this {
        this.filters.push({ column, operator: "contains", value: values });
        return this;
    }

    ilike(column: string, value: string): this {
        this.filters.push({ column, operator: "ilike", value });
        return this;
    }

    is(column: string, value: unknown): this {
        this.filters.push({ column, operator: "is", value });
        return this;
    }

    not(column: string, operator: string, value: unknown): this {
        this.filters.push({
            column,
            operator: "not",
            value: { operator, value },
        });
        return this;
    }

    or(raw: string): this {
        this.orFilters.push(parseOrFilter(raw));
        return this;
    }

    order(column: string, options: { ascending?: boolean } = {}): this {
        this.orders.push({ column, ascending: options.ascending ?? true });
        return this;
    }

    limit(count: number): this {
        this.rowLimit = count;
        return this;
    }

    range(start: number, end: number): this {
        this.rangeStart = start;
        this.rangeEnd = end;
        return this;
    }

    single(): this {
        this.singleResult = true;
        return this;
    }

    maybeSingle(): this {
        this.maybeSingleResult = true;
        return this;
    }

    then<TResult1 = QueryResponse<unknown>, TResult2 = never>(
        onfulfilled?:
            | ((
                  value: QueryResponse<unknown>
              ) => TResult1 | PromiseLike<TResult1>)
            | null,
        onrejected?:
            | ((reason: unknown) => TResult2 | PromiseLike<TResult2>)
            | null
    ): PromiseLike<TResult1 | TResult2> {
        return this.execute().then(onfulfilled, onrejected);
    }

    private execute(): Promise<QueryResponse<unknown>> {
        try {
            const response = this.executeSync();
            return Promise.resolve(response);
        } catch (error) {
            return Promise.resolve({
                data: null,
                error: { message: (error as Error).message },
                count: null,
            });
        }
    }

    private executeSync(): QueryResponse<unknown> {
        if (this.unavailableMessage) {
            return {
                data: null,
                error: { message: this.unavailableMessage },
                count: null,
            };
        }
        const existingRows = listRefugeRows(this.table);
        if (this.mode === "insert" || this.mode === "upsert") {
            return this.executeInsertOrUpsert(existingRows);
        }
        const matchedRows = this.getMatchedRows(existingRows);
        if (this.mode === "update")
            return this.executeUpdate(existingRows, matchedRows);
        if (this.mode === "delete")
            return this.executeDelete(existingRows, matchedRows);
        return this.formatRows(matchedRows);
    }

    private getMatchedRows(rows: RefugeRow[]): RefugeRow[] {
        let next = rows.filter((row) =>
            this.filters.every((filter) => matchesFilter(row, filter))
        );
        next = next.filter((row) =>
            this.orFilters.every((filters) => matchesOrFilter(row, filters))
        );
        if (this.orders.length > 0) next = applyOrdering(next, this.orders);
        if (this.rangeStart !== null && this.rangeEnd !== null) {
            next = next.slice(this.rangeStart, this.rangeEnd + 1);
        }
        if (this.rowLimit !== null) next = next.slice(0, this.rowLimit);
        return next;
    }

    private executeInsertOrUpsert(
        existingRows: RefugeRow[]
    ): QueryResponse<unknown> {
        const payloadRows = Array.isArray(this.payload)
            ? this.payload
            : this.payload
              ? [this.payload]
              : [];
        const now = new Date().toISOString();
        const rows = [...existingRows];
        const changedRows: RefugeRow[] = [];
        for (const payload of payloadRows) {
            const nextRow = { ...payload };
            if (refugeTableHasColumn(this.table, "id")) {
                nextRow.id ??= randomUUID();
            }
            if (refugeTableHasColumn(this.table, "created_at")) {
                nextRow.created_at ??= now;
            }
            if (refugeTableHasColumn(this.table, "updated_at")) {
                nextRow.updated_at = now;
            }
            const identity = this.resolveIdentity(nextRow);
            const index = rows.findIndex(
                (row) => this.resolveIdentity(row) === identity
            );
            const before = index >= 0 ? { ...rows[index]! } : null;
            if (index >= 0) rows[index] = { ...rows[index]!, ...nextRow };
            else rows.push(nextRow);
            const after = index >= 0 ? rows[index]! : nextRow;
            changedRows.push(after);
            this.journal(
                this.mode === "insert" ? "insert" : "upsert",
                identity,
                before,
                after
            );
        }
        writeRefugeRows(this.table, rows);
        return this.formatRows(changedRows);
    }

    private executeUpdate(
        existingRows: RefugeRow[],
        matchedRows: RefugeRow[]
    ): QueryResponse<unknown> {
        const payload = (this.payload ?? {}) as RefugeRow;
        const now = new Date().toISOString();
        const matchedIdentities = new Set(
            matchedRows.map((row) => this.resolveIdentity(row))
        );
        const changedRows: RefugeRow[] = [];
        const rows = existingRows.map((row) => {
            const identity = this.resolveIdentity(row);
            if (!matchedIdentities.has(identity)) return row;
            const after = { ...row, ...payload };
            if (refugeTableHasColumn(this.table, "updated_at")) {
                after.updated_at = now;
            }
            changedRows.push(after);
            this.journal("update", identity, row, after);
            return after;
        });
        writeRefugeRows(this.table, rows);
        return this.formatRows(changedRows);
    }

    private executeDelete(
        existingRows: RefugeRow[],
        matchedRows: RefugeRow[]
    ): QueryResponse<unknown> {
        const matchedIdentities = new Set(
            matchedRows.map((row) => this.resolveIdentity(row))
        );
        const rows = existingRows.filter((row) => {
            const identity = this.resolveIdentity(row);
            if (!matchedIdentities.has(identity)) return true;
            this.journal("delete", identity, row, null);
            return false;
        });
        writeRefugeRows(this.table, rows);
        return this.formatRows(matchedRows);
    }

    private formatRows(rows: RefugeRow[]): QueryResponse<unknown> {
        const count = rows.length;
        if (this.selectOptions.head) return { data: null, error: null, count };
        const projected = rows.map((row) =>
            projectRow(row, this.selectedFields)
        );
        if (this.singleResult || this.maybeSingleResult) {
            const first = projected[0] ?? null;
            if (!first && this.singleResult) {
                return {
                    data: null,
                    error: { message: "Row not found" },
                    count,
                };
            }
            return { data: first, error: null, count };
        }
        return { data: projected, error: null, count };
    }

    private resolveIdentity(row: RefugeRow): string {
        if (this.onConflict && row[this.onConflict] != null) {
            return String(row[this.onConflict]);
        }
        return getRefugeIdentity(this.table, row);
    }

    private journal(
        operation: "insert" | "update" | "upsert" | "delete",
        identity: string,
        before: RefugeRow | null,
        after: RefugeRow | null
    ): void {
        appendRefugeJournal({
            id: randomUUID(),
            at: new Date().toISOString(),
            table: this.table,
            operation,
            identity,
            before,
            after,
        });
    }
}

class RefugeServerClient {
    from(table: string): RefugeQueryBuilder {
        if (!isRefugeQueryableTable(table)) {
            return new RefugeQueryBuilder(
                table,
                `${table} is not available in refuge mode`
            );
        }
        return new RefugeQueryBuilder(table);
    }

    rpc(): RefugeQueryBuilder {
        return new RefugeQueryBuilder(
            "__unsupported_rpc__",
            "RPC is not available in refuge mode"
        );
    }
}

class NullServerClient {
    from(table: string): RefugeQueryBuilder {
        return new RefugeQueryBuilder(table, "serverClient 없음");
    }

    rpc(): RefugeQueryBuilder {
        return new RefugeQueryBuilder(
            "__unsupported_rpc__",
            "serverClient 없음"
        );
    }
}

const refugeServerClient = new RefugeServerClient();
const nullServerClient = new NullServerClient();

function getActiveClient(realClient: RealServerClient): unknown {
    if (isSqliteRefugeMode()) return refugeServerClient;
    return realClient ?? nullServerClient;
}

export function createRoutingServerClient(
    realClient: RealServerClient
): SupabaseClient {
    return new Proxy(
        {},
        {
            get(_target, property) {
                const active = getActiveClient(realClient) as Record<
                    PropertyKey,
                    unknown
                >;
                const value = active[property];
                return typeof value === "function" ? value.bind(active) : value;
            },
        }
    ) as SupabaseClient;
}
