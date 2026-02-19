import React, { act } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import App from '../App';

const createSeedTasks = () => [
  {
    id: 1,
    name: 'Test Task 1',
    startDate: '2026-02-01',
    dueDate: '2026-02-02',
    completed: false,
    createdAt: '2026-02-01T00:00:00.000Z',
    updatedAt: '2026-02-01T00:00:00.000Z',
  },
  {
    id: 2,
    name: 'Test Task 2',
    startDate: '2026-02-03',
    dueDate: '2026-02-04',
    completed: false,
    createdAt: '2026-02-03T00:00:00.000Z',
    updatedAt: '2026-02-03T00:00:00.000Z',
  },
];

let tasks = createSeedTasks();

// Mock server to intercept API requests
const server = setupServer(
  rest.get('/api/tasks', (req, res, ctx) => {
    const search = req.url.searchParams.get('search')?.toLowerCase().trim();
    const sortBy = req.url.searchParams.get('sortBy') || 'name';
    const sortOrder = req.url.searchParams.get('sortOrder') || 'asc';

    let filteredTasks = [...tasks];

    if (search) {
      const normalizedSearch = search
        .replace(/[.+^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.');
      const searchRegex = new RegExp(normalizedSearch, 'i');
      filteredTasks = filteredTasks.filter((task) => searchRegex.test(task.name));
    }

    filteredTasks.sort((leftTask, rightTask) => {
      const leftValue = leftTask[sortBy] || '';
      const rightValue = rightTask[sortBy] || '';

      if (leftValue < rightValue) {
        return sortOrder === 'desc' ? 1 : -1;
      }

      if (leftValue > rightValue) {
        return sortOrder === 'desc' ? -1 : 1;
      }

      return 0;
    });

    return res(ctx.status(200), ctx.json(filteredTasks));
  }),

  rest.post('/api/tasks', async (req, res, ctx) => {
    const { name } = req.body;

    if (!name || name.trim() === '') {
      return res(ctx.status(400), ctx.json({ error: 'Task name is required' }));
    }

    const payload = await req.json();
    const newTask = {
      id: tasks.length + 1,
      name: payload.name,
      startDate: payload.startDate || null,
      dueDate: payload.dueDate || null,
      completed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    tasks = [...tasks, newTask];
    return res(ctx.status(201), ctx.json(newTask));
  }),

  rest.patch('/api/tasks/:id/complete', (req, res, ctx) => {
    const taskId = Number(req.params.id);
    const targetTask = tasks.find((task) => task.id === taskId);

    if (!targetTask) {
      return res(ctx.status(404), ctx.json({ error: 'Task not found' }));
    }

    targetTask.completed = !targetTask.completed;
    targetTask.updatedAt = new Date().toISOString();

    return res(ctx.status(200), ctx.json(targetTask));
  }),

  rest.delete('/api/tasks/:id', (req, res, ctx) => {
    const taskId = Number(req.params.id);
    tasks = tasks.filter((task) => task.id !== taskId);
    return res(ctx.status(200), ctx.json({ message: 'Task deleted successfully', id: taskId }));
  })
);

// Setup and teardown for the mock server
beforeAll(() => server.listen());
afterEach(() => {
  tasks = createSeedTasks();
  server.resetHandlers();
});
afterAll(() => server.close());

describe('App Component', () => {
  test('renders the header', async () => {
    await act(async () => {
      render(<App />);
    });
    expect(screen.getByText('Neon To-Do App')).toBeInTheDocument();
    expect(screen.getByText('Track, plan, and complete your tasks')).toBeInTheDocument();
  });

  test('loads and displays tasks', async () => {
    await act(async () => {
      render(<App />);
    });

    // Initially shows loading state
    expect(screen.getByText('Loading data...')).toBeInTheDocument();

    // Wait for tasks to load
    await waitFor(() => {
      expect(screen.getByText('Test Task 1')).toBeInTheDocument();
      expect(screen.getByText('Test Task 2')).toBeInTheDocument();
    });
  });

  test('adds a new task', async () => {
    const user = userEvent.setup();

    await act(async () => {
      render(<App />);
    });

    // Wait for items to load
    await waitFor(() => {
      expect(screen.queryByText('Loading data...')).not.toBeInTheDocument();
    });

    // Fill in the form and submit
    const input = screen.getByPlaceholderText('Task name');
    await act(async () => {
      await user.type(input, 'New Test Task');
    });

    const submitButton = screen.getByRole('button', { name: 'Add Task' });
    await act(async () => {
      await user.click(submitButton);
    });

    // Check that the new item appears
    await waitFor(() => {
      expect(screen.getByText('New Test Task')).toBeInTheDocument();
    });
  });

  test('toggles task completion', async () => {
    const user = userEvent.setup();

    await act(async () => {
      render(<App />);
    });

    await waitFor(() => {
      expect(screen.getByText('Test Task 1')).toBeInTheDocument();
    });

    const taskCheckbox = screen.getByLabelText('Mark Test Task 1 completed');
    expect(taskCheckbox).not.toBeChecked();

    await act(async () => {
      await user.click(taskCheckbox);
    });

    await waitFor(() => {
      expect(screen.getByLabelText('Mark Test Task 1 completed')).toBeChecked();
    });
  });

  test('handles API error', async () => {
    // Override the default handler to simulate an error
    server.use(
      rest.get('/api/tasks', (req, res, ctx) => {
        return res(ctx.status(500));
      })
    );

    await act(async () => {
      render(<App />);
    });

    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText(/Failed to fetch tasks/)).toBeInTheDocument();
    });
  });

  test('shows empty state when no tasks', async () => {
    // Override the default handler to return empty array
    server.use(
      rest.get('/api/tasks', (req, res, ctx) => {
        return res(ctx.status(200), ctx.json([]));
      })
    );

    await act(async () => {
      render(<App />);
    });

    // Wait for empty state message
    await waitFor(() => {
      expect(screen.getByText('No tasks found. Add one to get started.')).toBeInTheDocument();
    });
  });
});