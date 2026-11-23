import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let pool: pg.Pool | null = null;

function getPool(): pg.Pool {
  if (pool) return pool;

  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) {
    throw new Error('DATABASE_URL environment variable is not configured.');
  }

  const parsed = new URL(rawUrl);
  const useSsl =
    parsed.searchParams.get('sslmode') === 'require' ||
    parsed.hostname.includes('aivencloud.com');
  parsed.searchParams.delete('sslmode');

  pool = new Pool({
    connectionString: parsed.toString(),
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  return pool;
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // Health check
  app.get('/api/health', async (_req: Request, res: Response) => {
    try {
      await getPool().query('SELECT 1');
      res.json({ ok: true, database: 'connected' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Database connection failed';
      res.status(503).json({ ok: false, error: message });
    }
  });

  // GET all students with active borrow state and borrow counts
  app.get('/api/students', async (_req: Request, res: Response) => {
    try {
      const result = await getPool().query(`
        SELECT
          s.usn,
          s.name,
          s.department,
          COALESCE(
            json_agg(
              json_build_object(
                'transaction_id', br.transaction_id,
                'book_id', b.book_id,
                'book_name', b.book_name,
                'author', b.author,
                'borrow_date', TO_CHAR(br.borrow_date, 'YYYY-MM-DD')
              )
              ORDER BY br.transaction_id DESC
            ) FILTER (WHERE br.return_status = 'Not Returned'),
            '[]'::json
          ) AS active_borrows,
          COUNT(br.transaction_id)::int AS total_borrows,
          COUNT(br.transaction_id) FILTER (WHERE br.return_status = 'Not Returned')::int AS active_count
        FROM student_new s
        LEFT JOIN borrow_list br ON s.usn = br.usn
        LEFT JOIN book_list b ON br.book_id = b.book_id
        GROUP BY s.usn, s.name, s.department
        ORDER BY s.usn ASC
      `);

      const students = result.rows.map((row) => ({
        usn: row.usn,
        name: row.name,
        department: row.department || 'Unassigned',
        has_borrowed: Number(row.active_count) > 0,
        active_borrows: row.active_borrows || [],
        total_borrows: Number(row.total_borrows) || 0,
      }));

      res.json(students);
    } catch (err) {
      console.error('Error fetching students:', err);
      res.status(500).json({ error: 'Failed to load student list from PostgreSQL.' });
    }
  });

  // POST create a new student in student_new
  app.post('/api/students', async (req: Request, res: Response) => {
    const usn = typeof req.body?.usn === 'string' ? req.body.usn.trim() : '';
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    const department = typeof req.body?.department === 'string' ? req.body.department.trim() : '';

    if (!usn || !name || !department) {
      res.status(400).json({ error: 'USN, student name, and department are required.' });
      return;
    }

    try {
      const existing = await getPool().query('SELECT usn FROM student_new WHERE usn = $1', [usn]);
      if (existing.rows.length > 0) {
        res.status(409).json({ error: `Student with USN ${usn} already exists.` });
        return;
      }

      await getPool().query(
        'INSERT INTO student_new (usn, name, department) VALUES ($1, $2, $3)',
        [usn, name, department]
      );

      res.status(201).json({
        usn,
        name,
        department,
        has_borrowed: false,
        active_borrows: [],
        total_borrows: 0,
      });
    } catch (err) {
      console.error('Error creating student:', err);
      res.status(500).json({ error: 'Failed to add student to PostgreSQL.' });
    }
  });

  // GET all books with borrowed/available status and current borrower
  app.get('/api/books', async (_req: Request, res: Response) => {
    try {
      const result = await getPool().query(`
        SELECT
          b.book_id,
          b.book_name,
          b.author,
          COUNT(br.transaction_id)::int AS total_borrows,
          COUNT(br.transaction_id) FILTER (WHERE br.return_status = 'Not Returned')::int AS active_count,
          (
            SELECT json_build_object(
              'transaction_id', abr.transaction_id,
              'usn', s.usn,
              'student_name', s.name,
              'department', s.department,
              'borrow_date', TO_CHAR(abr.borrow_date, 'YYYY-MM-DD')
            )
            FROM borrow_list abr
            LEFT JOIN student_new s ON abr.usn = s.usn
            WHERE abr.book_id = b.book_id AND abr.return_status = 'Not Returned'
            ORDER BY abr.transaction_id DESC
            LIMIT 1
          ) AS current_borrow
        FROM book_list b
        LEFT JOIN borrow_list br ON b.book_id = br.book_id
        GROUP BY b.book_id, b.book_name, b.author
        ORDER BY b.book_id ASC
      `);

      const books = result.rows.map((row) => ({
        book_id: Number(row.book_id),
        book_name: row.book_name,
        author: row.author || 'Unknown Author',
        is_borrowed: Number(row.active_count) > 0,
        current_borrow: row.current_borrow || null,
        total_borrows: Number(row.total_borrows) || 0,
      }));

      res.json(books);
    } catch (err) {
      console.error('Error fetching books:', err);
      res.status(500).json({ error: 'Failed to load book list from PostgreSQL.' });
    }
  });

  // POST create a new book in book_list
  app.post('/api/books', async (req: Request, res: Response) => {
    const bookName = typeof req.body?.book_name === 'string' ? req.body.book_name.trim() : '';
    const author = typeof req.body?.author === 'string' ? req.body.author.trim() : '';
    const rawBookId = req.body?.book_id;

    if (!bookName || !author) {
      res.status(400).json({ error: 'Book name and author details are required.' });
      return;
    }

    const client = await getPool().connect();
    try {
      await client.query('BEGIN');

      let bookId: number;
      if (rawBookId !== undefined && rawBookId !== null && String(rawBookId).trim() !== '') {
        bookId = Number(rawBookId);
        if (!Number.isInteger(bookId) || bookId <= 0) {
          await client.query('ROLLBACK');
          res.status(400).json({ error: 'Book ID must be a positive integer.' });
          return;
        }
        const dup = await client.query('SELECT book_id FROM book_list WHERE book_id = $1', [bookId]);
        if (dup.rows.length > 0) {
          await client.query('ROLLBACK');
          res.status(409).json({ error: `Book ID ${bookId} already exists.` });
          return;
        }
      } else {
        const maxRes = await client.query('SELECT COALESCE(MAX(book_id), 0) + 1 AS next_id FROM book_list');
        bookId = Number(maxRes.rows[0].next_id);
      }

      await client.query(
        'INSERT INTO book_list (book_id, book_name, author) VALUES ($1, $2, $3)',
        [bookId, bookName, author]
      );

      await client.query('COMMIT');
      res.status(201).json({
        book_id: bookId,
        book_name: bookName,
        author,
        is_borrowed: false,
        current_borrow: null,
        total_borrows: 0,
      });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error creating book:', err);
      res.status(500).json({ error: 'Failed to add book to PostgreSQL.' });
    } finally {
      client.release();
    }
  });

  // GET all borrow transactions from borrow_list joined with student_new and book_list
  app.get('/api/borrows', async (_req: Request, res: Response) => {
    try {
      const result = await getPool().query(`
        SELECT
          br.transaction_id,
          br.usn,
          s.name AS student_name,
          s.department,
          br.book_id,
          b.book_name,
          b.author,
          TO_CHAR(br.borrow_date, 'YYYY-MM-DD') AS borrow_date,
          br.return_status
        FROM borrow_list br
        LEFT JOIN student_new s ON br.usn = s.usn
        LEFT JOIN book_list b ON br.book_id = b.book_id
        ORDER BY br.transaction_id DESC
      `);

      const borrows = result.rows.map((row) => ({
        transaction_id: Number(row.transaction_id),
        usn: row.usn,
        student_name: row.student_name || 'Unknown Student',
        department: row.department || 'Unassigned',
        book_id: Number(row.book_id),
        book_name: row.book_name || `Book #${row.book_id}`,
        author: row.author || 'Unknown Author',
        borrow_date: row.borrow_date,
        return_status: row.return_status === 'Returned' ? 'Returned' : 'Not Returned',
      }));

      res.json(borrows);
    } catch (err) {
      console.error('Error fetching borrow list:', err);
      res.status(500).json({ error: 'Failed to load borrow list from PostgreSQL.' });
    }
  });

  // POST issue a new book borrow transaction
  app.post('/api/borrows', async (req: Request, res: Response) => {
    const usn = typeof req.body?.usn === 'string' ? req.body.usn.trim() : '';
    const bookId = Number(req.body?.book_id);
    const borrowDate =
      typeof req.body?.borrow_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(req.body.borrow_date)
        ? req.body.borrow_date
        : new Date().toISOString().slice(0, 10);

    if (!usn || !Number.isInteger(bookId) || bookId <= 0) {
      res.status(400).json({ error: 'Valid student USN and Book ID are required.' });
      return;
    }

    const client = await getPool().connect();
    try {
      await client.query('BEGIN');

      const studentRes = await client.query(
        'SELECT usn, name, department FROM student_new WHERE usn = $1',
        [usn]
      );
      if (studentRes.rows.length === 0) {
        await client.query('ROLLBACK');
        res.status(404).json({ error: `Student with USN ${usn} not found.` });
        return;
      }

      const bookRes = await client.query(
        'SELECT book_id, book_name, author FROM book_list WHERE book_id = $1',
        [bookId]
      );
      if (bookRes.rows.length === 0) {
        await client.query('ROLLBACK');
        res.status(404).json({ error: `Book ID ${bookId} not found.` });
        return;
      }

      const activeCheck = await client.query(
        "SELECT transaction_id FROM borrow_list WHERE book_id = $1 AND return_status = 'Not Returned'",
        [bookId]
      );
      if (activeCheck.rows.length > 0) {
        await client.query('ROLLBACK');
        res.status(409).json({
          error: `Book #${bookId} ("${bookRes.rows[0].book_name}") is currently borrowed and must be returned first.`,
        });
        return;
      }

      const nextRes = await client.query(
        'SELECT COALESCE(MAX(transaction_id), 0) + 1 AS next_id FROM borrow_list'
      );
      const transactionId = Number(nextRes.rows[0].next_id);

      await client.query(
        `INSERT INTO borrow_list (transaction_id, usn, book_id, borrow_date, return_status)
         VALUES ($1, $2, $3, $4, 'Not Returned')`,
        [transactionId, usn, bookId, borrowDate]
      );

      await client.query('COMMIT');

      res.status(201).json({
        transaction_id: transactionId,
        usn,
        student_name: studentRes.rows[0].name,
        department: studentRes.rows[0].department,
        book_id: bookId,
        book_name: bookRes.rows[0].book_name,
        author: bookRes.rows[0].author,
        borrow_date: borrowDate,
        return_status: 'Not Returned',
      });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error issuing book:', err);
      res.status(500).json({ error: 'Failed to record borrow transaction in PostgreSQL.' });
    } finally {
      client.release();
    }
  });

  // PATCH update return status of a borrow transaction
  app.patch('/api/borrows/:transactionId/return', async (req: Request, res: Response) => {
    const transactionId = Number(req.params.transactionId);
    if (!Number.isInteger(transactionId) || transactionId <= 0) {
      res.status(400).json({ error: 'Invalid transaction ID.' });
      return;
    }

    const nextStatus = req.body?.return_status === 'Not Returned' ? 'Not Returned' : 'Returned';

    try {
      const result = await getPool().query(
        `UPDATE borrow_list
         SET return_status = $1
         WHERE transaction_id = $2
         RETURNING transaction_id, usn, book_id, TO_CHAR(borrow_date, 'YYYY-MM-DD') AS borrow_date, return_status`,
        [nextStatus, transactionId]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: `Transaction #${transactionId} not found.` });
        return;
      }

      res.json(result.rows[0]);
    } catch (err) {
      console.error('Error updating return status:', err);
      res.status(500).json({ error: 'Failed to update return status in PostgreSQL.' });
    }
  });

  // Mount Vite middleware in dev, or serve static dist in production/start/preview
  const isProductionMode =
    process.env.NODE_ENV === 'production' ||
    process.env.npm_lifecycle_event === 'start' ||
    process.env.npm_lifecycle_event === 'preview';

  if (!isProductionMode) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Library Portal server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
