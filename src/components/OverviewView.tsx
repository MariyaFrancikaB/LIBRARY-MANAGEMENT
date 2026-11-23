import { ArrowRight, CheckCircle2 } from 'lucide-react';
import type { ActiveSection, BookRecord, BorrowRecord, StudentRecord } from '../types/library';

interface OverviewViewProps {
  students: StudentRecord[];
  books: BookRecord[];
  borrows: BorrowRecord[];
  loading: boolean;
  onNavigate: (section: ActiveSection, filterPreset?: string) => void;
  onMarkReturned: (transactionId: number) => Promise<void>;
  onOpenIssueForBook: (bookId: number) => void;
  returningId: number | null;
}

export function OverviewView({
  students,
  books,
  borrows,
  loading,
  onNavigate,
  onMarkReturned,
  onOpenIssueForBook,
  returningId,
}: OverviewViewProps) {
  const studentsWithBorrows = students.filter((s) => s.has_borrowed);
  const studentsWithoutBorrows = students.filter((s) => !s.has_borrowed);
  const borrowedBooks = books.filter((b) => b.is_borrowed);
  const availableBooks = books.filter((b) => !b.is_borrowed);
  const activeBorrows = borrows.filter((br) => br.return_status === 'Not Returned');
  const returnedCount = borrows.filter((br) => br.return_status === 'Returned').length;

  return (
    <div className="space-y-6">
      {/* 4-Column KPI Summary Strip */}
      <section aria-label="Library circulation metrics" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <button
          type="button"
          onClick={() => onNavigate('students')}
          className="group flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-5 text-left transition-colors hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700"
        >
          <span className="text-xs font-medium text-slate-500">Registered Students</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-display text-3xl font-semibold tracking-tight text-slate-900 tabular-nums">
              {loading ? '—' : students.length}
            </span>
            <span className="text-xs text-slate-500 group-hover:text-slate-900 flex items-center gap-1">
              View list <ArrowRight className="h-3 w-3" />
            </span>
          </div>
          <p className="mt-3 border-t border-slate-100 pt-2.5 text-xs text-slate-600 tabular-nums">
            {studentsWithBorrows.length} borrowed · {studentsWithoutBorrows.length} not borrowed
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('books')}
          className="group flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-5 text-left transition-colors hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700"
        >
          <span className="text-xs font-medium text-slate-500">Catalogue Books</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-display text-3xl font-semibold tracking-tight text-slate-900 tabular-nums">
              {loading ? '—' : books.length}
            </span>
            <span className="text-xs text-slate-500 group-hover:text-slate-900 flex items-center gap-1">
              View list <ArrowRight className="h-3 w-3" />
            </span>
          </div>
          <p className="mt-3 border-t border-slate-100 pt-2.5 text-xs text-slate-600 tabular-nums">
            {borrowedBooks.length} with borrowed · {availableBooks.length} without borrowed
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('borrows', 'Not Returned')}
          className="group flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-5 text-left transition-colors hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700"
        >
          <span className="text-xs font-medium text-slate-500">Currently Borrowed</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-display text-3xl font-semibold tracking-tight text-amber-700 tabular-nums">
              {loading ? '—' : activeBorrows.length}
            </span>
            <span className="text-xs text-slate-500 group-hover:text-slate-900 flex items-center gap-1">
              Not returned <ArrowRight className="h-3 w-3" />
            </span>
          </div>
          <p className="mt-3 border-t border-slate-100 pt-2.5 text-xs text-slate-600 tabular-nums">
            Active loans awaiting return
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('borrows', 'Returned')}
          className="group flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-5 text-left transition-colors hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700"
        >
          <span className="text-xs font-medium text-slate-500">Returned Loans</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-display text-3xl font-semibold tracking-tight text-emerald-700 tabular-nums">
              {loading ? '—' : returnedCount}
            </span>
            <span className="text-xs text-slate-500 group-hover:text-slate-900 flex items-center gap-1">
              History <ArrowRight className="h-3 w-3" />
            </span>
          </div>
          <p className="mt-3 border-t border-slate-100 pt-2.5 text-xs text-slate-600 tabular-nums">
            {borrows.length} total borrow transactions
          </p>
        </button>
      </section>

      {/* Two-Column Operational Split */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-stretch">
        {/* Active Borrowed Books */}
        <section className="flex flex-col rounded-lg border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900">
                Active Loans (Not Returned)
              </h2>
              <p className="text-xs text-slate-500">
                Books currently checked out to students
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('borrows', 'Not Returned')}
              className="text-xs font-medium text-blue-700 hover:text-blue-800 whitespace-nowrap"
            >
              View all
            </button>
          </div>

          <div className="flex-1 divide-y divide-slate-100">
            {loading ? (
              <div className="p-5 space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-11 animate-pulse rounded bg-slate-100" />
                ))}
              </div>
            ) : activeBorrows.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                All books have been returned. No active loans pending.
              </div>
            ) : (
              activeBorrows.slice(0, 6).map((item) => (
                <div
                  key={item.transaction_id}
                  className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-slate-50/70"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">
                      <span className="font-mono text-xs text-slate-500 mr-1.5">
                        #{item.book_id}
                      </span>
                      {item.book_name}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {item.student_name} · USN{' '}
                      <span className="font-mono text-slate-700">{item.usn}</span> ·{' '}
                      <span className="font-mono tabular-nums">{item.borrow_date}</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={returningId === item.transaction_id}
                    onClick={() => onMarkReturned(item.transaction_id)}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800 disabled:opacity-50 whitespace-nowrap"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {returningId === item.transaction_id ? 'Saving...' : 'Mark Returned'}
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Available Books (Without Borrowed) */}
        <section className="flex flex-col rounded-lg border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900">
                Available on Shelf (Without Borrowed)
              </h2>
              <p className="text-xs text-slate-500">
                Books ready to be issued to students
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('books', 'Without Borrowed')}
              className="text-xs font-medium text-blue-700 hover:text-blue-800 whitespace-nowrap"
            >
              View all
            </button>
          </div>

          <div className="flex-1 divide-y divide-slate-100">
            {loading ? (
              <div className="p-5 space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-11 animate-pulse rounded bg-slate-100" />
                ))}
              </div>
            ) : availableBooks.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                All catalogue books are currently borrowed.
              </div>
            ) : (
              availableBooks.slice(0, 6).map((book) => (
                <div
                  key={book.book_id}
                  className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-slate-50/70"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">
                      <span className="font-mono text-xs text-slate-500 mr-1.5">
                        #{book.book_id}
                      </span>
                      {book.book_name}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {book.author} · {book.total_borrows} historical{' '}
                      {book.total_borrows === 1 ? 'loan' : 'loans'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenIssueForBook(book.book_id)}
                    className="shrink-0 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-800 whitespace-nowrap"
                  >
                    Issue Book
                  </button>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
