const request = require('supertest');
const { app, db } = require('../src/app');

const createTestTasks = (count) => {
  const insertStmt = db.prepare(
    'INSERT INTO tasks (name, start_date, due_date, completed) VALUES (?, ?, ?, ?)' 
  );

  const insertMany = db.transaction((taskCount) => {
    for (let index = 0; index < taskCount; index += 1) {
      const day = String((index % 28) + 1).padStart(2, '0');
      insertStmt.run(`Perf Task ${index}`, `2026-03-${day}`, `2026-04-${day}`, 0);
    }
  });

  insertMany(count);
};

describe('Performance checks', () => {
  beforeAll(() => {
    createTestTasks(800);
  });

  test('GET /api/tasks returns large datasets within acceptable time', async () => {
    const startTime = Date.now();
    const response = await request(app).get('/api/tasks?sortBy=name&sortOrder=asc');
    const durationMs = Date.now() - startTime;

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(700);
    expect(durationMs).toBeLessThan(1500);
  });

  test('GET /api/tasks handles wildcard search quickly', async () => {
    const startTime = Date.now();
    const response = await request(app).get('/api/tasks?search=Perf*&sortBy=dueDate&sortOrder=desc');
    const durationMs = Date.now() - startTime;

    expect(response.status).toBe(200);
    expect(response.body.length).toBeGreaterThan(700);
    expect(durationMs).toBeLessThan(1500);
  });
});
