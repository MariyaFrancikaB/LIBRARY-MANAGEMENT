import { useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import type { BookRecord, StudentRecord } from '../types/library';

interface IssueBookModalProps {
  students: StudentRecord[];
  books: BookRecord[];
  defaultUsn?: string;
  defaultBookId?: number;
  onClose: () => void;
  onSubmit: (payload: { usn: string; book_id: number; borrow_date: string }) => Promise<void>;
}

export function IssueBookModal({
  students,
  books,
  defaultUsn = '',
  defaultBookId,
  onClose,
  onSubmit,
}: IssueBookModalProps) {
  const availableBooks = books.filter((b) => !b.is_borrowed);
  const [usn, setUsn] = useState(defaultUsn || (students[0]?.usn ?? ''));
  const [bookId, setBookId] = useState<string>(
    defaultBookId ? String(defaultBookId) : availableBooks[0] ? String(availableBooks[0].book_id) : ''
  );
  const [borrowDate, setBorrowDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!usn || !bookId) {
      setError('Please select both a student and an available book.');
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({ usn, book_id: Number(bookId), borrow_date: borrowDate });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to issue book.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="issue-book-title"
    >
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white shadow-lg">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 id="issue-book-title" className="font-display text-base font-semibold text-slate-900">
            Issue Book to Student
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="issue-student" className="block text-xs font-medium text-slate-700">
              Student (USN & Name)
            </label>
            <select
              id="issue-student"
              value={usn}
              onChange={(e) => setUsn(e.target.value)}
              className="mt-1.5 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700"
              required
            >
              <option value="" disabled>
                Select a student
              </option>
              {students.map((s) => (
                <option key={s.usn} value={s.usn}>
                  {s.usn} — {s.name} ({s.department})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="issue-book" className="block text-xs font-medium text-slate-700">
              Available Book
            </label>
            <select
              id="issue-book"
              value={bookId}
              onChange={(e) => setBookId(e.target.value)}
              className="mt-1.5 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700"
              required
            >
              <option value="" disabled>
                {availableBooks.length === 0
                  ? 'No available books on shelf'
                  : 'Select an available book'}
              </option>
              {availableBooks.map((b) => (
                <option key={b.book_id} value={b.book_id}>
                  #{b.book_id} — {b.book_name} ({b.author})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="issue-date" className="block text-xs font-medium text-slate-700">
              Borrow Date
            </label>
            <input
              id="issue-date"
              type="date"
              value={borrowDate}
              onChange={(e) => setBorrowDate(e.target.value)}
              className="mt-1.5 h-10 w-full rounded-md border border-slate-300 bg-white px-3 font-mono text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || availableBooks.length === 0}
              className="rounded-md bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {submitting ? 'Recording...' : 'Confirm Issue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface AddStudentModalProps {
  existingDepartments: string[];
  onClose: () => void;
  onSubmit: (payload: { usn: string; name: string; department: string }) => Promise<void>;
}

export function AddStudentModal({
  existingDepartments,
  onClose,
  onSubmit,
}: AddStudentModalProps) {
  const [usn, setUsn] = useState('');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState(existingDepartments[0] ?? 'Computer Science');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!usn.trim() || !name.trim() || !department.trim()) {
      setError('All student fields are required.');
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({
        usn: usn.trim(),
        name: name.trim(),
        department: department.trim(),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to register student.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-student-title"
    >
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white shadow-lg">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 id="add-student-title" className="font-display text-base font-semibold text-slate-900">
            Register New Student
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="student-usn" className="block text-xs font-medium text-slate-700">
              Student USN
            </label>
            <input
              id="student-usn"
              type="text"
              value={usn}
              onChange={(e) => setUsn(e.target.value)}
              placeholder="e.g. 1016"
              className="mt-1.5 h-10 w-full rounded-md border border-slate-300 bg-white px-3 font-mono text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700"
              required
            />
          </div>

          <div>
            <label htmlFor="student-name" className="block text-xs font-medium text-slate-700">
              Full Name
            </label>
            <input
              id="student-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sophia Patel"
              className="mt-1.5 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700"
              required
            />
          </div>

          <div>
            <label htmlFor="student-dept" className="block text-xs font-medium text-slate-700">
              Department
            </label>
            <input
              id="student-dept"
              list="department-options"
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="e.g. Computer Science"
              className="mt-1.5 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700"
              required
            />
            <datalist id="department-options">
              {existingDepartments.map((dept) => (
                <option key={dept} value={dept} />
              ))}
            </datalist>
          </div>

          <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Save Student'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface AddBookModalProps {
  nextSuggestedId: number;
  onClose: () => void;
  onSubmit: (payload: { book_id?: number; book_name: string; author: string }) => Promise<void>;
}

export function AddBookModal({ nextSuggestedId, onClose, onSubmit }: AddBookModalProps) {
  const [bookId, setBookId] = useState(String(nextSuggestedId));
  const [bookName, setBookName] = useState('');
  const [author, setAuthor] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!bookName.trim() || !author.trim()) {
      setError('Book name and author details are required.');
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({
        book_id: bookId.trim() ? Number(bookId.trim()) : undefined,
        book_name: bookName.trim(),
        author: author.trim(),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to add book.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-book-title"
    >
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white shadow-lg">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 id="add-book-title" className="font-display text-base font-semibold text-slate-900">
            Add Book to Catalogue
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="book-id" className="block text-xs font-medium text-slate-700">
              Book ID
            </label>
            <input
              id="book-id"
              type="number"
              min={1}
              value={bookId}
              onChange={(e) => setBookId(e.target.value)}
              className="mt-1.5 h-10 w-full rounded-md border border-slate-300 bg-white px-3 font-mono text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700"
            />
          </div>

          <div>
            <label htmlFor="book-name" className="block text-xs font-medium text-slate-700">
              Book Name
            </label>
            <input
              id="book-name"
              type="text"
              value={bookName}
              onChange={(e) => setBookName(e.target.value)}
              placeholder="e.g. Clean Code"
              className="mt-1.5 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700"
              required
            />
          </div>

          <div>
            <label htmlFor="book-author" className="block text-xs font-medium text-slate-700">
              Book Details (Author)
            </label>
            <input
              id="book-author"
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="e.g. Robert C. Martin"
              className="mt-1.5 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Save Book'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
