import { useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import type { BookRecord } from '../types/library';

interface BookListViewProps {
  books: BookRecord[];
  loading: boolean;
  initialFilter?: 'all' | 'borrowed' | 'available';
  onAddBook: () => void;
  onIssueBook: (bookId: number) => void;
  onMarkReturned: (transactionId: number) => Promise<void>;
  returningId: number | null;
}

type BookFilter = 'all' | 'borrowed' | 'available';

export function BookListView({
  books,
  loading,
  initialFilter = 'all',
  onAddBook,
  onIssueBook,
  onMarkReturned,
  returningId,
}: BookListViewProps) {
  const [filter, setFilter] = useState<BookFilter>(initialFilter);
  const [query, setQuery] = useState('');

  const borrowedCount = books.filter((b) => b.is_borrowed).length;
  const availableCount = books.length - borrowedCount;

  const filteredBooks = useMemo(() => {
    const q = query.trim().toLowerCase();
    return books.filter((book) => {
      if (filter === 'borrowed' && !book.is_borrowed) return false;
      if (filter === 'available' && book.is_borrowed) return false;
      if (!q) return true;
      return (
        String(book.book_id).includes(q) ||
        book.book_name.toLowerCase().includes(q) ||
        book.author.toLowerCase().includes(q) ||
        (book.current_borrow?.student_name.toLowerCase().includes(q) ?? false) ||
        (book.current_borrow?.usn.toLowerCase().includes(q) ?? false)
      );
    });
  }, [books, filter, query]);

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
            All Books ({books.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('borrowed')}
            className={`rounded px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
              filter === 'borrowed'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            With Borrowed ({borrowedCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter('available')}
            className={`rounded px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
              filter === 'available'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Without Borrowed ({availableCount})
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1 sm:w-64 sm:flex-initial">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Book ID, title, author..."
              className="h-9 w-full rounded-md border border-slate-200 bg-white pl-8 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700"
            />
          </div>

          <button
            type="button"
            onClick={onAddBook}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3.5 text-xs font-medium text-slate-800 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Book
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-medium text-slate-500">
                <th className="px-5 py-3">Book ID</th>
                <th className="px-5 py-3">Book Name</th>
                <th className="px-5 py-3">Book Details (Author)</th>
                <th className="px-5 py-3">Circulation Status</th>
                <th className="px-5 py-3">Current Borrower</th>
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
              ) : filteredBooks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center">
                    <p className="text-sm font-medium text-slate-900">
                      No matching books found
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Adjust your filter or add a new book to the library catalogue.
                    </p>
                    <button
                      type="button"
                      onClick={onAddBook}
                      className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3.5 py-2 text-xs font-medium text-white hover:bg-slate-800"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Book
                    </button>
                  </td>
                </tr>
              ) : (
                filteredBooks.map((book) => (
                  <tr key={book.book_id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-3.5 font-mono text-xs font-medium text-slate-900 tabular-nums whitespace-nowrap">
                      #{String(book.book_id).padStart(3, '0')}
                    </td>
                    <td className="px-5 py-3.5 font-medium text-slate-900">
                      {book.book_name}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">
                      <span>{book.author}</span>
                      <span className="mx-1.5 text-slate-300" aria-hidden="true">
                        ·
                      </span>
                      <span className="text-xs text-slate-500 tabular-nums">
                        {book.total_borrows} {book.total_borrows === 1 ? 'loan' : 'loans'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      {book.is_borrowed ? (
                        <span className="inline-block rounded bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
                          With Borrowed
                        </span>
                      ) : (
                        <span className="inline-block rounded bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800">
                          Without Borrowed
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-600">
                      {book.current_borrow ? (
                        <div>
                          <span className="font-medium text-slate-900">
                            {book.current_borrow.student_name}
                          </span>
                          <span className="mx-1.5 text-slate-300">·</span>
                          <span className="font-mono text-slate-600">
                            {book.current_borrow.usn}
                          </span>
                          <p className="mt-0.5 font-mono text-[11px] text-slate-500 tabular-nums">
                            Borrowed {book.current_borrow.borrow_date}
                          </p>
                        </div>
                      ) : (
                        <span className="text-slate-400">Available on shelf</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      {book.is_borrowed && book.current_borrow ? (
                        <button
                          type="button"
                          disabled={returningId === book.current_borrow.transaction_id}
                          onClick={() => onMarkReturned(book.current_borrow!.transaction_id)}
                          className="rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800 disabled:opacity-50"
                        >
                          {returningId === book.current_borrow.transaction_id
                            ? 'Saving...'
                            : 'Mark Returned'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onIssueBook(book.book_id)}
                          className="rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-800"
                        >
                          Issue Book
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
