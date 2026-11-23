import { BookOpen, LayoutGrid, Users, ArrowLeftRight, X } from 'lucide-react';
import type { ActiveSection } from '../types/library';

interface SidebarProps {
  activeSection: ActiveSection;
  onSelectSection: (section: ActiveSection) => void;
  counts: {
    students: number;
    books: number;
    borrows: number;
    notReturned: number;
    availableBooks: number;
  };
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({
  activeSection,
  onSelectSection,
  counts,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const navItems: Array<{
    id: ActiveSection;
    label: string;
    count?: number;
    icon: typeof LayoutGrid;
  }> = [
    { id: 'overview', label: 'Overview', icon: LayoutGrid },
    { id: 'students', label: 'Student List', count: counts.students, icon: Users },
    { id: 'books', label: 'Book List', count: counts.books, icon: BookOpen },
    { id: 'borrows', label: 'Borrow List', count: counts.borrows, icon: ArrowLeftRight },
  ];

  const handleNavClick = (id: ActiveSection) => {
    onSelectSection(id);
    onCloseMobile();
  };

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[252px] shrink-0 flex-col border-r border-slate-200 bg-white transition-transform duration-150 ease-out lg:static lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-5">
          <button
            type="button"
            onClick={() => handleNavClick('overview')}
            className="flex items-center gap-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 rounded-md"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-900 text-white">
              <BookOpen className="h-4 w-4" />
            </span>
            <span className="font-display text-base font-semibold tracking-tight text-slate-900 whitespace-nowrap">
              Athenaeum
            </span>
          </button>

          <button
            type="button"
            onClick={onCloseMobile}
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 lg:hidden"
            aria-label="Close navigation menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Library sections">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`flex w-full items-center justify-between rounded-md px-3 py-2.5 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 ${
                  isActive
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span className="flex items-center gap-2.5 whitespace-nowrap">
                  <Icon
                    className={`h-4 w-4 shrink-0 ${
                      isActive ? 'text-slate-200' : 'text-slate-500'
                    }`}
                  />
                  <span>{item.label}</span>
                </span>
                {item.count !== undefined && (
                  <span
                    className={`font-mono text-xs tabular-nums ${
                      isActive ? 'text-slate-300' : 'text-slate-500'
                    }`}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 px-5 py-4">
          <p className="text-xs font-medium text-slate-500">Circulation Summary</p>
          <dl className="mt-3 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <dt className="text-slate-600">Active Loans</dt>
              <dd className="font-mono font-medium text-amber-700 tabular-nums">
                {counts.notReturned}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-600">Available Books</dt>
              <dd className="font-mono font-medium text-emerald-700 tabular-nums">
                {counts.availableBooks}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-600">Registered Students</dt>
              <dd className="font-mono font-medium text-slate-900 tabular-nums">
                {counts.students}
              </dd>
            </div>
          </dl>
        </div>
      </aside>
    </>
  );
}
