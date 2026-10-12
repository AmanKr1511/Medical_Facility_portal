import { useMemo, useState } from 'react';
import { AsyncView, DataTable, SearchBar } from '../../../core/ui';

/**
 * Card with a search box and a table, used for both "Given today" panels.
 * `state` is a useAsync result; `searchKey` is the row field the search matches.
 */
export default function SearchableTable({ state, columns, searchKey, searchPlaceholder, emptyMessage }) {
  const [query, setQuery] = useState('');

  const rows = useMemo(() => {
    const all = state.data ?? [];
    const q = query.toLowerCase();
    return q ? all.filter((r) => String(r[searchKey]).toLowerCase().includes(q)) : all;
  }, [state.data, query, searchKey]);

  return (
    <div className="card panel">
      <SearchBar placeholder={searchPlaceholder} onSearch={setQuery} />
      <AsyncView loading={state.loading} error={state.error} onRetry={state.reload}>
        <DataTable
          columns={columns}
          rows={rows}
          scroll
          emptyMessage={query ? 'No results match your search.' : emptyMessage}
        />
      </AsyncView>
    </div>
  );
}
