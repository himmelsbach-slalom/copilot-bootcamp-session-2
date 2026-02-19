const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const Database = require('better-sqlite3');

// Initialize express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Initialize in-memory SQLite database
const db = new Database(':memory:');

const ALLOWED_SORT_COLUMNS = {
  name: 'name',
  startDate: 'start_date',
  start_date: 'start_date',
  dueDate: 'due_date',
  due_date: 'due_date',
};

const isValidDate = (value) => {
  if (typeof value !== 'string') {
    return false;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime());
};

const normalizeOptionalDate = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  return value;
};

const formatTask = (task) => ({
  id: task.id,
  name: task.name,
  startDate: task.start_date,
  dueDate: task.due_date,
  completed: Boolean(task.completed),
  createdAt: task.created_at,
  updatedAt: task.updated_at,
});

const validateTaskInput = ({ name, startDate, dueDate, requiresName }) => {
  if (requiresName) {
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return 'Task name is required';
    }
  }

  if (startDate !== null && startDate !== undefined && !isValidDate(startDate)) {
    return 'Start date must be in YYYY-MM-DD format';
  }

  if (dueDate !== null && dueDate !== undefined && !isValidDate(dueDate)) {
    return 'Due date must be in YYYY-MM-DD format';
  }

  if (startDate && dueDate && dueDate < startDate) {
    return 'Due date must be on or after start date';
  }

  return null;
};

const parseTaskId = (value) => {
  const parsed = Number.parseInt(value, 10);

  if (Number.isNaN(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
};

const convertSearchTermToLikePattern = (term) => {
  const wildcardPattern = term.replace(/\*/g, '%').replace(/\?/g, '_');

  if (wildcardPattern.includes('%') || wildcardPattern.includes('_')) {
    return wildcardPattern;
  }

  return `%${wildcardPattern}%`;
};

const buildTaskSearchQuery = (searchText) => {
  if (!searchText || typeof searchText !== 'string' || searchText.trim() === '') {
    return { whereClause: '', params: [] };
  }

  const terms = searchText
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(convertSearchTermToLikePattern);

  if (terms.length === 0) {
    return { whereClause: '', params: [] };
  }

  return {
    whereClause: `WHERE ${terms.map(() => 'name LIKE ?').join(' AND ')}`,
    params: terms,
  };
};

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    start_date TEXT,
    due_date TEXT,
    completed INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`);

// Insert some initial data
const initialTasks = ['Item 1', 'Item 2', 'Item 3'];
const insertTaskStmt = db.prepare(
  'INSERT INTO tasks (name, start_date, due_date, completed) VALUES (@name, @start_date, @due_date, @completed)'
);

initialTasks.forEach((itemName) => {
  insertTaskStmt.run({
    name: itemName,
    start_date: null,
    due_date: null,
    completed: 0,
  });
});

console.log('In-memory database initialized with sample data');

const selectTaskByIdStmt = db.prepare('SELECT * FROM tasks WHERE id = ?');

// Task API Routes
app.get('/api/tasks', (req, res) => {
  try {
    const { search, sortBy = 'name', sortOrder = 'asc' } = req.query;
    const sortColumn = ALLOWED_SORT_COLUMNS[sortBy] || 'name';
    const sortDirection = String(sortOrder).toLowerCase() === 'desc' ? 'DESC' : 'ASC';
    const { whereClause, params } = buildTaskSearchQuery(search);

    const tasks = db
      .prepare(`SELECT * FROM tasks ${whereClause} ORDER BY ${sortColumn} ${sortDirection}, id ASC`)
      .all(...params)
      .map(formatTask);

    res.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

app.post('/api/tasks', (req, res) => {
  try {
    const { name } = req.body;
    const startDate = normalizeOptionalDate(req.body.startDate);
    const dueDate = normalizeOptionalDate(req.body.dueDate);

    const validationError = validateTaskInput({
      name,
      startDate,
      dueDate,
      requiresName: true,
    });

    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const result = insertTaskStmt.run({
      name: name.trim(),
      start_date: startDate,
      due_date: dueDate,
      completed: 0,
    });

    const newTask = selectTaskByIdStmt.get(result.lastInsertRowid);
    res.status(201).json(formatTask(newTask));
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

app.patch('/api/tasks/:id', (req, res) => {
  try {
    const taskId = parseTaskId(req.params.id);

    if (!taskId) {
      return res.status(400).json({ error: 'Valid task ID is required' });
    }

    const existingTask = selectTaskByIdStmt.get(taskId);

    if (!existingTask) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const hasName = Object.prototype.hasOwnProperty.call(req.body, 'name');
    const hasStartDate = Object.prototype.hasOwnProperty.call(req.body, 'startDate');
    const hasDueDate = Object.prototype.hasOwnProperty.call(req.body, 'dueDate');
    const hasCompleted = Object.prototype.hasOwnProperty.call(req.body, 'completed');

    if (!hasName && !hasStartDate && !hasDueDate && !hasCompleted) {
      return res.status(400).json({ error: 'At least one task field must be provided' });
    }

    const nextName = hasName ? req.body.name : existingTask.name;
    const nextStartDate = hasStartDate
      ? normalizeOptionalDate(req.body.startDate)
      : existingTask.start_date;
    const nextDueDate = hasDueDate ? normalizeOptionalDate(req.body.dueDate) : existingTask.due_date;
    const nextCompleted = hasCompleted ? req.body.completed : Boolean(existingTask.completed);

    if (hasCompleted && typeof req.body.completed !== 'boolean') {
      return res.status(400).json({ error: 'Completed must be a boolean' });
    }

    const validationError = validateTaskInput({
      name: nextName,
      startDate: nextStartDate,
      dueDate: nextDueDate,
      requiresName: true,
    });

    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    db.prepare(
      `
      UPDATE tasks
      SET name = ?, start_date = ?, due_date = ?, completed = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `
    ).run(nextName.trim(), nextStartDate, nextDueDate, nextCompleted ? 1 : 0, taskId);

    const updatedTask = selectTaskByIdStmt.get(taskId);
    res.json(formatTask(updatedTask));
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

app.patch('/api/tasks/:id/complete', (req, res) => {
  try {
    const taskId = parseTaskId(req.params.id);

    if (!taskId) {
      return res.status(400).json({ error: 'Valid task ID is required' });
    }

    const existingTask = selectTaskByIdStmt.get(taskId);

    if (!existingTask) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (
      Object.prototype.hasOwnProperty.call(req.body, 'completed') &&
      typeof req.body.completed !== 'boolean'
    ) {
      return res.status(400).json({ error: 'Completed must be a boolean' });
    }

    const nextCompleted = Object.prototype.hasOwnProperty.call(req.body, 'completed')
      ? req.body.completed
      : !Boolean(existingTask.completed);

    db.prepare('UPDATE tasks SET completed = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(
      nextCompleted ? 1 : 0,
      taskId
    );

    const updatedTask = selectTaskByIdStmt.get(taskId);
    res.json(formatTask(updatedTask));
  } catch (error) {
    console.error('Error updating completion state:', error);
    res.status(500).json({ error: 'Failed to update completion state' });
  }
});

app.delete('/api/tasks/:id', (req, res) => {
  try {
    const taskId = parseTaskId(req.params.id);

    if (!taskId) {
      return res.status(400).json({ error: 'Valid task ID is required' });
    }

    const existingTask = selectTaskByIdStmt.get(taskId);

    if (!existingTask) {
      return res.status(404).json({ error: 'Task not found' });
    }

    db.prepare('DELETE FROM tasks WHERE id = ?').run(taskId);
    res.json({ message: 'Task deleted successfully', id: taskId });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// Legacy item routes retained for compatibility while frontend migration is in progress.
app.get('/api/items', (req, res) => {
  try {
    const items = db
      .prepare('SELECT id, name, created_at FROM tasks ORDER BY created_at DESC, id DESC')
      .all();
    res.json(items);
  } catch (error) {
    console.error('Error fetching items:', error);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

app.post('/api/items', (req, res) => {
  try {
    const { name } = req.body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ error: 'Item name is required' });
    }

    const result = insertTaskStmt.run({
      name: name.trim(),
      start_date: null,
      due_date: null,
      completed: 0,
    });
    const id = result.lastInsertRowid;

    const newItem = db.prepare('SELECT id, name, created_at FROM tasks WHERE id = ?').get(id);
    res.status(201).json(newItem);
  } catch (error) {
    console.error('Error creating item:', error);
    res.status(500).json({ error: 'Failed to create item' });
  }
});

app.delete('/api/items/:id', (req, res) => {
  try {
    const taskId = parseTaskId(req.params.id);

    if (!taskId) {
      return res.status(400).json({ error: 'Valid item ID is required' });
    }

    const existingItem = selectTaskByIdStmt.get(taskId);
    if (!existingItem) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const result = db.prepare('DELETE FROM tasks WHERE id = ?').run(taskId);

    if (result.changes > 0) {
      res.json({ message: 'Item deleted successfully', id: taskId });
    } else {
      res.status(404).json({ error: 'Item not found' });
    }
  } catch (error) {
    console.error('Error deleting item:', error);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

module.exports = { app, db };