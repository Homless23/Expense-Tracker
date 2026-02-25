import React, { useMemo, useState } from 'react';
import Button from './Button';
import EmptyState from './EmptyState';

const DataTable = ({
  columns,
  data,
  rowKey = '_id',
  searchable = false,
  searchPlaceholder = 'Search...',
  filterKeys = [],
  initialSort = null,
  pageSize = 8,
  loading = false,
  emptyTitle,
  emptyDescription
}) => {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState(initialSort);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const list = Array.isArray(data) ? data : [];
    if (!searchable || !query.trim()) return list;
    const q = query.trim().toLowerCase();
    return list.filter((row) => {
      const keys = filterKeys.length ? filterKeys : columns.map((c) => c.key);
      return keys.some((key) => String(row?.[key] ?? '').toLowerCase().includes(q));
    });
  }, [columns, data, filterKeys, query, searchable]);

  const sorted = useMemo(() => {
    if (!sort?.key) return filtered;
    const next = [...filtered];
    next.sort((a, b) => {
      const av = a?.[sort.key];
      const bv = b?.[sort.key];
      if (typeof av === 'number' && typeof bv === 'number') {
        return sort.dir === 'asc' ? av - bv : bv - av;
      }
      return sort.dir === 'asc'
        ? String(av ?? '').localeCompare(String(bv ?? ''))
        : String(bv ?? '').localeCompare(String(av ?? ''));
    });
    return next;
  }, [filtered, sort]);

  const totalPages = Math.max(Math.ceil(sorted.length / pageSize), 1);
  const safePage = Math.min(page, totalPages);
  const paged = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  const onSort = (col) => {
    if (!col.sortable) return;
    setPage(1);
    setSort((prev) => {
      if (!prev || prev.key !== col.key) return { key: col.key, dir: 'asc' };
      return { key: col.key, dir: prev.dir === 'asc' ? 'desc' : 'asc' };
    });
  };

  return (
    <div className="data-table-wrap">
      {searchable ? (
        <div className="data-table-head">
          <input
            className="data-table-search"
            value={query}
            placeholder={searchPlaceholder}
            onChange={(e) => {
              setPage(1);
              setQuery(e.target.value);
            }}
          />
        </div>
      ) : null}

      <div className="data-table-scroll">
        <table className="dashboard-table enhanced-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => onSort(col)}
                  className={col.sortable ? 'th-sortable' : ''}
                >
                  {col.label}
                  {sort?.key === col.key ? (sort.dir === 'asc' ? ' (asc)' : ' (desc)') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!loading && paged.length ? paged.map((row) => (
              <tr key={row[rowKey]}>
                {columns.map((col) => (
                  <td key={`${row[rowKey]}-${col.key}`}>
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            )) : null}
          </tbody>
        </table>
      </div>

      {!loading && !paged.length ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : null}

      <div className="pagination-bar">
        <Button variant="ghost" onClick={() => setPage((p) => Math.max(p - 1, 1))} disabled={safePage <= 1}>
          Prev
        </Button>
        <span className="muted">Page {safePage} of {totalPages}</span>
        <Button variant="ghost" onClick={() => setPage((p) => Math.min(p + 1, totalPages))} disabled={safePage >= totalPages}>
          Next
        </Button>
      </div>
    </div>
  );
};

export default DataTable;
