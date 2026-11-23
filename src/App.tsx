import { useCallback, useEffect, useMemo, useState } from 'react';
import { Menu, Plus, RefreshCw } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { OverviewView } from './components/OverviewView';
import { StudentListView } from './components/StudentListView';
import { BookListView } from './components/BookListView';
import { BorrowListView } from './components/BorrowListView';
import { AddBookModal, AddStudentModal, IssueBookModal } from './components/ActionModals';
import type { ActiveSection, BookRecord, BorrowRecord, StudentRecord } from './types/library';

const SECTION_META: Record<ActiveSection, { title: string; subtitle: string }> = {
  overview: {
    title: 'Circulation Overview',
    subtitle: 'Live summary of student registrations, book availability, and active loans',
  },
  students: {
    title: 'Student List',
    subtitle: 'Students with USN, department, and current book borrow status',
  },
  books: {
    title: 'Book List',
    subtitle: 'Library catalogue with book details and borrowed or available status',
  },
  borrows: {
    title: 'Borrow List',
    subtitle: 'Complete circulation ledger tracking student USN, book ID, and return status',
  },
};

export default function App() {
  const [activeSection, setActiveSection] = useState<ActiveSection>('overview');
  const [bookInitialFilter, setBookInitialFilter] = useState<'all' | 'borrowed' | 'available'>('all');
  const [borrowInitialFilter, setBorrowInitialFilter] = useState<'all' | 'Not Returned' | 'Returned'>('all');
  const [viewKey, setViewKey] = useState(0);

  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [books, setBooks] = useState<BookRecord[]>([]);
  const [borrows, setBorrows] = useState<BorrowRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingBorrowId, setUpdatingBorrowId] = useState<number | null>(null);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [issueModalState, setIssueModalState] = useState<{
    open: boolean;
    defaultUsn?: string;
    defaultBookId?: number;
  }>({ open: false });
  const [addStudentOpen, setAddStudentOpen] = useState(false);
  const [addBookOpen, setAddBookOpen] = useState(false);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [studentsRes, booksRes, borrowsRes] = await Promise.all([
        fetch('/api/students'),
        fetch('/api/books'),
        fetch('/api/borrows'),
      ]);

      const failed = [studentsRes, booksRes, borrowsRes].find((r) => !r.ok);
      if (failed) {
        if (failed.status === 404) {
          throw new Error(
            'API endpoints returned 404. Ensure the app is deployed with the Node server (npm start) rather than static-only hosting.'
          );
        }
        const errBody = (await failed.json().catch(() => ({}))) as { error?: string };
        throw new Error(errBody.error || 'Unable to load library records from PostgreSQL.');
      }

      const [studentsData, booksData, borrowsData] = await Promise.all([
        studentsRes.json() as Promise<StudentRecord[]>,
        booksRes.json() as Promise<BookRecord[]>,
        borrowsRes.json() as Promise<BorrowRecord[]>,
      ]);

      setStudents(studentsData);
      setBooks(booksData);
      setBorrows(borrowsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Database connection error.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAllData();
  }, [fetchAllData]);

  const handleNavigate = useCallback((section: ActiveSection, filterPreset?: string) => {
    if (section === 'books') {
      if (filterPreset === 'Without Borrowed') setBookInitialFilter('available');
      else if (filterPreset === 'With Borrowed') setBookInitialFilter('borrowed');
      else setBookInitialFilter('all');
    } else if (section === 'borrows') {
      if (filterPreset === 'Not Returned') setBorrowInitialFilter('Not Returned');
      else if (filterPreset === 'Returned') setBorrowInitialFilter('Returned');
      else setBorrowInitialFilter('all');
    }
    setViewKey((k) => k + 1);
    setActiveSection(section);
  }, []);

  const handleUpdateBorrowStatus = useCallback(
    async (transactionId: number, status: 'Returned' | 'Not Returned' = 'Returned') => {
      setUpdatingBorrowId(transactionId);
      setError(null);
      try {
        const res = await fetch(`/api/borrows/${transactionId}/return`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ return_status: status }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error || 'Failed to update borrow record.');
        }
        await fetchAllData();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update return status.');
      } finally {
        setUpdatingBorrowId(null);
      }
    },
    [fetchAllData]
  );

  const handleIssueBook = useCallback(
    async (payload: { usn: string; book_id: number; borrow_date: string }) => {
      const res = await fetch('/api/borrows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || 'Failed to record borrow transaction.');
      }
      await fetchAllData();
    },
    [fetchAllData]
  );

  const handleAddStudent = useCallback(
    async (payload: { usn: string; name: string; department: string }) => {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || 'Failed to register student.');
      }
      await fetchAllData();
    },
    [fetchAllData]
  );

  const handleAddBook = useCallback(
    async (payload: { book_id?: number; book_name: string; author: string }) => {
      const res = await fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || 'Failed to add book.');
      }
      await fetchAllData();
    },
    [fetchAllData]
  );

  const counts = useMemo(() => {
    const notReturned = borrows.filter((b) => b.return_status === 'Not Returned').length;
    const availableBooks = books.filter((b) => !b.is_borrowed).length;
    return {
      students: students.length,
      books: books.length,
      borrows: borrows.length,
      notReturned,
      availableBooks,
    };
  }, [students, books, borrows]);

  const existingDepartments = useMemo(() => {
    return Array.from(new Set(students.map((s) => s.department))).sort();
  }, [students]);

  const nextBookId = useMemo(() => {
    if (books.length === 0) return 1;
    return Math.max(...books.map((b) => b.book_id)) + 1;
  }, [books]);

  const currentMeta = SECTION_META[activeSection];

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      <Sidebar
        activeSection={activeSection}
        onSelectSection={(sec) => handleNavigate(sec)}
        counts={counts}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Bar Contract: Breadcrumb on left, single primary action on right */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="rounded-md p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 lg:hidden"
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm truncate">
              <span className="text-slate-500 whitespace-nowrap">Library Portal</span>
              <span className="text-slate-300" aria-hidden="true">
                /
              </span>
              <span className="font-medium text-slate-900 truncate">{currentMeta.title}</span>
            </nav>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => void fetchAllData()}
              disabled={loading}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap shrink-0"
              aria-label="Refresh PostgreSQL data"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              type="button"
              onClick={() => setIssueModalState({ open: true })}
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-slate-900 px-3.5 text-xs font-medium text-white transition-colors hover:bg-slate-800 whitespace-nowrap shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              Issue Book
            </button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mb-6">
            <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-900 text-balance">
              {currentMeta.title}
            </h1>
            <p className="mt-1 text-sm text-slate-600">{currentMeta.subtitle}</p>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-6 flex items-center justify-between gap-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            >
              <span>{error}</span>
              <button
                type="button"
                onClick={() => void fetchAllData()}
                className="rounded border border-red-300 bg-white px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50 whitespace-nowrap"
              >
                Retry
              </button>
            </div>
          )}

          {activeSection === 'overview' && (
            <OverviewView
              students={students}
              books={books}
              borrows={borrows}
              loading={loading}
              onNavigate={handleNavigate}
              onMarkReturned={(id) => handleUpdateBorrowStatus(id, 'Returned')}
              onOpenIssueForBook={(bookId) =>
                setIssueModalState({ open: true, defaultBookId: bookId })
              }
              returningId={updatingBorrowId}
            />
          )}

          {activeSection === 'students' && (
            <StudentListView
              students={students}
              loading={loading}
              onAddStudent={() => setAddStudentOpen(true)}
              onIssueForStudent={(usn) =>
                setIssueModalState({ open: true, defaultUsn: usn })
              }
              onMarkReturned={(id) => handleUpdateBorrowStatus(id, 'Returned')}
              returningId={updatingBorrowId}
            />
          )}

          {activeSection === 'books' && (
            <BookListView
              key={`books-${viewKey}`}
              books={books}
              loading={loading}
              initialFilter={bookInitialFilter}
              onAddBook={() => setAddBookOpen(true)}
              onIssueBook={(bookId) =>
                setIssueModalState({ open: true, defaultBookId: bookId })
              }
              onMarkReturned={(id) => handleUpdateBorrowStatus(id, 'Returned')}
              returningId={updatingBorrowId}
            />
          )}

          {activeSection === 'borrows' && (
            <BorrowListView
              key={`borrows-${viewKey}`}
              borrows={borrows}
              loading={loading}
              initialFilter={borrowInitialFilter}
              onIssueNew={() => setIssueModalState({ open: true })}
              onUpdateStatus={handleUpdateBorrowStatus}
              updatingId={updatingBorrowId}
            />
          )}
        </main>
      </div>

      {issueModalState.open && (
        <IssueBookModal
          students={students}
          books={books}
          defaultUsn={issueModalState.defaultUsn}
          defaultBookId={issueModalState.defaultBookId}
          onClose={() => setIssueModalState({ open: false })}
          onSubmit={handleIssueBook}
        />
      )}

      {addStudentOpen && (
        <AddStudentModal
          existingDepartments={existingDepartments}
          onClose={() => setAddStudentOpen(false)}
          onSubmit={handleAddStudent}
        />
      )}

      {addBookOpen && (
        <AddBookModal
          nextSuggestedId={nextBookId}
          onClose={() => setAddBookOpen(false)}
          onSubmit={handleAddBook}
        />
      )}
    </div>
  );
}

