import './ui.css';

/**
 * columns: [{ key, header, render?(row), width? }]
 * `scroll` caps the height and scrolls the body (header stays sticky).
 */
export default function DataTable({
  columns,
  rows,
  getRowKey = (row) => row.id,
  emptyMessage = 'Nothing to show.',
  scroll = false,
}) {
  const table = (
    <table className="table">
      <thead>
        <tr>
          {columns.map((c) => (
            <th key={c.key} style={c.width ? { width: c.width } : undefined}>
              {c.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={columns.length} className="table__empty">
              {emptyMessage}
            </td>
          </tr>
        ) : (
          rows.map((row) => (
            <tr key={getRowKey(row)}>
              {columns.map((c) => (
                <td key={c.key}>{c.render ? c.render(row) : row[c.key]}</td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  );

  return <div className="table-wrap">{scroll ? <div className="table-scroll">{table}</div> : table}</div>;
}
