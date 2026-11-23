export interface ActiveBorrowSummary {
  transaction_id: number;
  book_id: number;
  book_name: string;
  author: string;
  borrow_date: string;
}

export interface StudentRecord {
  usn: string;
  name: string;
  department: string;
  has_borrowed: boolean;
  active_borrows: ActiveBorrowSummary[];
  total_borrows: number;
}

export interface CurrentBookBorrower {
  transaction_id: number;
  usn: string;
  student_name: string;
  department: string;
  borrow_date: string;
}

export interface BookRecord {
  book_id: number;
  book_name: string;
  author: string;
  is_borrowed: boolean;
  current_borrow: CurrentBookBorrower | null;
  total_borrows: number;
}

export interface BorrowRecord {
  transaction_id: number;
  usn: string;
  student_name: string;
  department: string;
  book_id: number;
  book_name: string;
  author: string;
  borrow_date: string;
  return_status: 'Returned' | 'Not Returned';
}

export type ActiveSection = 'overview' | 'students' | 'books' | 'borrows';
