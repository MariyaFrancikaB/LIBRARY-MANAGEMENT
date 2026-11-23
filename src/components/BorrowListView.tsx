import { useMemo, useState } from 'react';
import { CheckCircle2, Plus, RotateCcw, Search } from 'lucide-react';
import type { BorrowRecord } from '../types/library';

interface BorrowListViewProps {
  borrows: BorrowRecord[];
  loading: boolean;
  initialFilter?: 'all' | 'Not Returned' | 'Returned';
  onIssueNew: () => void;
  onUpdateStatus: (transactionId: number, status: 'Returned' | 'Not Returned') => Promise<void>;
  updatingId: number | null;
}

type BorrowFilter = 'all' | 'Not Returned' | 'Returned';

export function BorrowListView({
  borrows,
  loading,
  initialFilter = 'all',
  onIssueNew,
  onUpdateStatus,
  updatingId,
}: BorrowListViewProps) {
  const [filter, setFilter] = useState<BorrowFilter>(initialFilter);
  const [query, setQuery] = useState('');

  const notReturnedCount = borrows.filter((b) => b.return_status === 'Not Returned').length;
  const returnedCount = borrows.filter((b) => b.return_status === 'Returned').length;

  const filteredBorrows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return borrows.filter((item) => {
      if (filter !== 'all' && item.return_status !== filter) return false;
      if (!q) return true;
      return (
        String(item.transaction_id).includes(q) ||
        item.usn.toLowerCase().includes(q) ||
        item.student_name.toLowerCase().includes(q) ||
        item.department.toLowerCase().includes(q) ||
        String(item.book_id).includes(q) ||
        item.book_name.toLowerCase().includes(q)
      );
    });
  }, [borrows, filter, query]);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="inline-flex flex-wrap rounded-md border border-slate-200 bg-slate-100 p-0.5 self-start">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`rounded px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
              filter === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Records ({borrows.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('Not Returned')}
            className={`rounded px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
              filter === 'Not Returned'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Not Returned ({notReturnedCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter('Returned')}
            className={`rounded px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
              filter === 'Returned'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Returned ({returnedCount})
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1 sm:w-64 sm:flex-initial">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search student, USN, book ID..."
              className="h-9 w-full rounded-md border border-slate-200 bg-white pl-8 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700"
            />
          </div>

          <button
            type="button"
            onClick={onIssueNew}
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-slate-900 px-3.5 text-xs font-medium text-white transition-colors hover:bg-slate-800 whitespace-nowrap shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            Issue Book
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-medium text-slate-500">
                <th className="px-5 py-3">Transaction ID</th>
                <th className="px-5 py-3">Student (USN & Name)</th>
                <th className="px-5 py-3">Book ID & Title</th>
                <th className="px-5 py-3">Borrow Date</th>
                <th className="px-5 py-3">Return Status</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                Array.from({ length: 6 }).map((_, idx) => (
                  <tr key={idx}>
                    <td colSpan={6} className="px-5 py-3.5">
                      <div className="h-5 animate-pulse rounded bg-slate-100" />
                    </td>
                  </tr>
                ))
              ) : filteredBorrows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center">
                    <p className="text-sm font-medium text-slate-900">
                      No borrow transactions match this view
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Issue a book to a student to create a new circulation record.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredBorrows.map((record) => {
                  const isReturned = record.return_status === 'Returned';
                  const isBusy = updatingId === record.transaction_id;
                  return (
                    <tr key={record.transaction_id} className="hover:bg-slate-50/70">
                      <td className="px-5 py-3.5 font-mono text-xs font-medium text-slate-700 tabular-nums whitespace-nowrap">
                        TXN-{String(record.transaction_id).padStart(4, '0')}
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-slate-900">{record.student_name}</p>
                        <p className="text-xs text-slate-500">
                          <span className="font-mono text-slate-700">{record.usn}</span>
                          <span className="mx-1.5 text-slate-300" aria-hidden="true">
                            ·
                          </span>
                          <span>{record.department}</span>
                        </p>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-slate-900">
                          <span className="font-mono text-xs text-slate-500 mr-1.5">
                            #{record.book_id}
                          </span>
                          {record.book_name}
                        </p>
                        <p className="text-xs text-slate-500">{record.author}</p>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs text-slate-600 tabular-nums whitespace-nowrap">
                        {record.borrow_date}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {isReturned ? (
                          <span className="inline-block rounded bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800">
                            Returned
                          </span>
                        ) : (
                          <span className="inline-block rounded bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
                            Not Returned
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        {isReturned ? (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() =>
                              onUpdateStatus(record.transaction_id, 'Not Returned')
                            }
                            className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50"
                          >
                            <RotateCcw className="h-3 w-3" />
                            {isBusy ? 'Saving...' : 'Re-open'}
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => onUpdateStatus(record.transaction_id, 'Returned')}
                            className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800 disabled:opacity-50"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {isBusy ? 'Saving...' : 'Mark Returned'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
