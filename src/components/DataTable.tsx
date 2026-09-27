import { Fragment, type ReactNode } from "react";

export type Column<T> = {
  id: string;
  header: string;
  cell: (row: T) => ReactNode;
  align?: "start" | "end" | "numeric";
  width?: string;
};

export function DataTable<T>({
  columns,
  rows,
  getRowId,
  caption,
  minWidth,
  renderAfterRow,
}: {
  columns: Column<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  caption: string;
  minWidth?: number;
  renderAfterRow?: (row: T) => ReactNode | null;
}) {
  return (
    <div className="table-scroll">
      <table className="data-table" style={minWidth ? { minWidth } : undefined}>
        <caption className="visually-hidden">{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.id}
                scope="col"
                className={
                  column.align === "end" || column.align === "numeric" ? "is-end" : undefined
                }
                style={column.width ? { width: column.width } : undefined}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const extra = renderAfterRow?.(row);
            return (
              <Fragment key={getRowId(row)}>
                <tr>
                  {columns.map((column) => (
                    <td
                      key={column.id}
                      className={
                        column.align === "numeric"
                          ? "is-numeric"
                          : column.align === "end"
                            ? "is-end"
                            : undefined
                      }
                    >
                      {column.cell(row)}
                    </td>
                  ))}
                </tr>
                {extra ? (
                  <tr className="data-table__detail">
                    <td colSpan={columns.length}>{extra}</td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
