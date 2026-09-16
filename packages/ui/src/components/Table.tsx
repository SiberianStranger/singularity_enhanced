import { type ReactNode, useMemo, useState } from "react";

export interface Column<T> {
  id: string;
  header: ReactNode;
  /** Cell content. */
  cell(row: T): ReactNode;
  /** Sort key; a column without one is not sortable. */
  sort?(row: T): number | string;
  align?: "start" | "end";
}

interface TableProps<T> {
  rows: readonly T[];
  columns: readonly Column<T>[];
  rowKey(row: T): string;
  onRowClick?(row: T): void;
  selectedKey?: string | null;
  empty: ReactNode;
  caption?: string;
}

/** A sortable table. Clicking a sortable header cycles ascending and descending. */
export function Table<T>({
  rows,
  columns,
  rowKey,
  onRowClick,
  selectedKey,
  empty,
  caption,
}: TableProps<T>): ReactNode {
  const [sortId, setSortId] = useState<string | null>(null);
  const [descending, setDescending] = useState(false);

  const sorted = useMemo(() => {
    const column = columns.find((entry) => entry.id === sortId);
    if (column?.sort === undefined) {
      return rows;
    }
    const sortOf = column.sort;
    return [...rows].sort((a, b) => {
      const left = sortOf(a);
      const right = sortOf(b);
      const order =
        typeof left === "number" && typeof right === "number"
          ? left - right
          : String(left).localeCompare(String(right));
      return descending ? -order : order;
    });
  }, [rows, columns, sortId, descending]);

  if (rows.length === 0) {
    return <p className="px-2 py-4 text-sm text-muted">{empty}</p>;
  }

  return (
    <table className="w-full border-collapse text-sm">
      {caption === undefined ? null : <caption className="sr-only">{caption}</caption>}
      <thead>
        <tr className="border-b border-line text-start text-xs uppercase tracking-wide text-muted">
          {columns.map((column) => (
            <th
              key={column.id}
              scope="col"
              className={`px-1 py-0.5 font-medium ${column.align === "end" ? "text-end" : "text-start"}`}
              aria-sort={
                sortId === column.id ? (descending ? "descending" : "ascending") : undefined
              }
            >
              {column.sort === undefined ? (
                column.header
              ) : (
                <button
                  type="button"
                  // The column the table is sorted by is underlined, with an arrow for the
                  // direction: "sorted by this one" is a state the player has to be able to read
                  // off the header rather than infer from the order of the rows.
                  className={`hover:text-fg ${sortId === column.id ? "text-fg underline" : ""}`}
                  onClick={() => {
                    if (sortId === column.id) {
                      setDescending(!descending);
                    } else {
                      setSortId(column.id);
                      setDescending(false);
                    }
                  }}
                >
                  {column.header}
                  {sortId === column.id ? (
                    <span aria-hidden="true" className="ms-1 font-mono">
                      {descending ? "\u2193" : "\u2191"}
                    </span>
                  ) : null}
                </button>
              )}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {sorted.map((row) => {
          const key = rowKey(row);
          return (
            <tr
              key={key}
              onClick={onRowClick === undefined ? undefined : () => onRowClick(row)}
              className={`border-b border-line/60 ${onRowClick === undefined ? "" : "cursor-pointer hover:bg-panel2"} ${selectedKey === key ? "bg-panel2" : ""}`}
            >
              {columns.map((column) => (
                <td
                  key={column.id}
                  className={`px-1 py-0.5 align-top ${column.align === "end" ? "text-end font-mono" : "text-start"}`}
                >
                  {column.cell(row)}
                </td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
