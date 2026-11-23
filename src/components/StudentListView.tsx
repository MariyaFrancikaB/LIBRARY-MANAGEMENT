import { useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import type { StudentRecord } from '../types/library';

interface StudentListViewProps {
  students: StudentRecord[];
  loading: boolean;
  onAddStudent: () => void;
  onIssueForStudent: (usn: string) => void;
  onMarkReturned: (transactionId: number) => Promise<void>;
  returningId: number | null;
}

type StudentFilter = 'all' | 'borrowed' | 'not_borrowed';

export function StudentListView({
  students,
  loading,
  onAddStudent,
  onIssueForStudent,
  onMarkReturned,
  returningId,
}: StudentListViewProps) {
  const [filter, setFilter] = useState<StudentFilter>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [query, setQuery] = useState('');

  const departments = useMemo(() => {
    const unique = Array.from(new Set(students.map((s) => s.department))).sort();
    return unique;
  }, [students]);

  const borrowedCount = students.filter((s) => s.has_borrowed).length;
  const notBorrowedCount = students.length - borrowedCount;

  const filteredStudents = useMemo(() => {
    const q = query.trim().toLowerCase();
    return students.filter((student) => {
      if (filter === 'borrowed' && !student.has_borrowed) return false;
      if (filter === 'not_borrowed' && student.has_borrowed) return false;
      if (departmentFilter !== 'all' && student.department !== departmentFilter) return false;
      if (!q) return true;
      return (
        student.usn.toLowerCase().includes(q) ||
        student.name.toLowerCase().includes(q) ||
        student.department.toLowerCase().includes(q) ||
        student.active_borrows.some((b) => b.book_name.toLowerCase().includes(q))
      );
    });
  }, [students, filter, departmentFilter, query]);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-md border border-slate-200 bg-slate-100 p-0.5">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`rounded px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                filter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Students ({students.length})
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
              Borrowed Book ({borrowedCount})
            </button>
            <button
              type="button"
              onClick={() => setFilter('not_borrowed')}
              className={`rounded px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                filter === 'not_borrowed'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Not Borrowed ({notBorrowedCount})
            </button>
          </div>

          <select
            aria-label="Filter by department"
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="h-9 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700"
          >
            <option value="all">All Departments</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1 sm:w-64 sm:flex-initial">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search USN, name, department..."
              className="h-9 w-full rounded-md border border-slate-200 bg-white pl-8 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700"
            />
          </div>

          <button
            type="button"
            onClick={onAddStudent}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3.5 text-xs font-medium text-slate-800 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Student
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-medium text-slate-500">
                <th className="px-5 py-3">Student USN</th>
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Department</th>
                <th className="px-5 py-3">Book Status</th>
                <th className="px-5 py-3 text-right">Total Borrows</th>
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
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center">
                    <p className="text-sm font-medium text-slate-900">
                      No matching students found
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Try clearing your search filter or register a new student.
                    </p>
                    <button
                      type="button"
                      onClick={onAddStudent}
                      className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3.5 py-2 text-xs font-medium text-white hover:bg-slate-800"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Student
                    </button>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => {
                  const firstActive = student.active_borrows[0];
                  return (
                    <tr key={student.usn} className="hover:bg-slate-50/70">
                      <td className="px-5 py-3.5 font-mono text-xs font-medium text-slate-900 tabular-nums whitespace-nowrap">
                        {student.usn}
                      </td>
                      <td className="px-5 py-3.5 font-medium text-slate-900 whitespace-nowrap">
                        {student.name}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">{student.department}</td>
                      <td className="px-5 py-3.5">
                        {student.has_borrowed ? (
                          <div>
                            <span className="inline-block rounded bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
                              Borrowed
                            </span>
                            {student.active_borrows.map((borrow) => (
                              <p
                                key={borrow.transaction_id}
                                className="mt-1 text-xs text-slate-600"
                              >
                                <span className="font-mono text-slate-500">
                                  #{borrow.book_id}
                                </span>{' '}
                                {borrow.book_name}
                              </p>
                            ))}
                          </div>
                        ) : (
                          <span className="inline-block rounded bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800">
                            Not Borrowed
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono text-xs text-slate-600 tabular-nums">
                        {student.total_borrows}
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          {firstActive && (
                            <button
                              type="button"
                              disabled={returningId === firstActive.transaction_id}
                              onClick={() => onMarkReturned(firstActive.transaction_id)}
                              className="rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800 disabled:opacity-50"
                            >
                              {returningId === firstActive.transaction_id
                                ? 'Saving...'
                                : 'Return'}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onIssueForStudent(student.usn)}
                            className="rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-800"
                          >
                            Issue Book
                          </button>
                        </div>
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
