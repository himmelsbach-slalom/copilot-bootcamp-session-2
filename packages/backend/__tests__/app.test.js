const request = require('supertest');
const { app } = require('../src/app');

// Test helpers
const createTask = async ({
  name = 'Temp Task',
  startDate = '2026-02-01',
  dueDate = '2026-02-05',
} = {}) => {
  const response = await request(app).post('/api/tasks').send({ name, startDate, dueDate });

  expect(response.status).toBe(201);
  expect(response.body).toHaveProperty('id');
  return response.body;
};

describe('API Endpoints', () => {
  describe('GET /api/tasks', () => {
    it('should return all tasks', async () => {
      const response = await request(app).get('/api/tasks');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      const task = response.body[0];
      expect(task).toHaveProperty('id');
      expect(task).toHaveProperty('name');
      expect(task).toHaveProperty('startDate');
      expect(task).toHaveProperty('dueDate');
      expect(task).toHaveProperty('completed');
      expect(task).toHaveProperty('createdAt');
      expect(task).toHaveProperty('updatedAt');
    });

    it('supports wildcard and keyword search', async () => {
      await createTask({ name: 'Alpha task', startDate: '2026-03-01', dueDate: '2026-03-04' });
      await createTask({ name: 'Beta mission', startDate: '2026-03-05', dueDate: '2026-03-10' });

      const wildcardResponse = await request(app).get('/api/tasks?search=Al*');
      expect(wildcardResponse.status).toBe(200);
      expect(wildcardResponse.body.some((task) => task.name === 'Alpha task')).toBe(true);

      const keywordResponse = await request(app).get('/api/tasks?search=mission');
      expect(keywordResponse.status).toBe(200);
      expect(keywordResponse.body.some((task) => task.name === 'Beta mission')).toBe(true);
    });

    it('supports sorting by due date descending', async () => {
      await createTask({ name: 'Sort A', startDate: '2026-01-01', dueDate: '2026-01-10' });
      await createTask({ name: 'Sort B', startDate: '2026-01-01', dueDate: '2026-01-20' });

      const response = await request(app).get('/api/tasks?sortBy=dueDate&sortOrder=desc');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);

      const firstSortB = response.body.findIndex((task) => task.name === 'Sort B');
      const firstSortA = response.body.findIndex((task) => task.name === 'Sort A');
      expect(firstSortB).toBeGreaterThanOrEqual(0);
      expect(firstSortA).toBeGreaterThanOrEqual(0);
      expect(firstSortB).toBeLessThan(firstSortA);
    });
  });

  describe('POST /api/tasks', () => {
    it('should create a new task with dates', async () => {
      const newTask = { name: 'Test Task', startDate: '2026-02-10', dueDate: '2026-02-15' };
      const response = await request(app).post('/api/tasks').send(newTask);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(newTask.name);
      expect(response.body.startDate).toBe(newTask.startDate);
      expect(response.body.dueDate).toBe(newTask.dueDate);
      expect(response.body.completed).toBe(false);
    });

    it('should return 400 if due date is before start date', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .send({ name: 'Bad Dates', startDate: '2026-02-10', dueDate: '2026-02-09' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Due date must be on or after start date');
    });

    it('should return 400 if name is missing', async () => {
      const response = await request(app).post('/api/tasks').send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Task name is required');
    });
  });

  describe('PATCH /api/tasks/:id', () => {
    it('should update task name and dates', async () => {
      const task = await createTask({
        name: 'Original Name',
        startDate: '2026-04-01',
        dueDate: '2026-04-03',
      });

      const response = await request(app)
        .patch(`/api/tasks/${task.id}`)
        .send({ name: 'Updated Name', startDate: '2026-04-02', dueDate: '2026-04-04' });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Updated Name');
      expect(response.body.startDate).toBe('2026-04-02');
      expect(response.body.dueDate).toBe('2026-04-04');
    });

    it('should return 400 when patch body is empty', async () => {
      const task = await createTask({ name: 'Patch Me' });
      const response = await request(app).patch(`/api/tasks/${task.id}`).send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'At least one task field must be provided');
    });
  });

  describe('PATCH /api/tasks/:id/complete', () => {
    it('should toggle completed state', async () => {
      const task = await createTask({ name: 'Completion Task' });

      const completeResponse = await request(app).patch(`/api/tasks/${task.id}/complete`).send({});
      expect(completeResponse.status).toBe(200);
      expect(completeResponse.body.completed).toBe(true);

      const incompleteResponse = await request(app)
        .patch(`/api/tasks/${task.id}/complete`)
        .send({ completed: false });
      expect(incompleteResponse.status).toBe(200);
      expect(incompleteResponse.body.completed).toBe(false);
    });
  });

  describe('Legacy item compatibility', () => {
    it('GET /api/items still returns item-like records', async () => {
      const response = await request(app).get('/api/items');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('name');
      expect(response.body[0]).toHaveProperty('created_at');
    });

    it('should return 400 if name is empty', async () => {
      const response = await request(app)
        .post('/api/items')
        .send({ name: '' })
        .set('Accept', 'application/json');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Item name is required');
    });
  });

  describe('DELETE /api/items/:id', () => {
    it('should delete an existing item', async () => {
      const itemResponse = await request(app).post('/api/items').send({ name: 'Item To Be Deleted' });
      const item = itemResponse.body;

      const deleteResponse = await request(app).delete(`/api/items/${item.id}`);
      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body).toEqual({ message: 'Item deleted successfully', id: item.id });

      const deleteAgain = await request(app).delete(`/api/items/${item.id}`);
      expect(deleteAgain.status).toBe(404);
      expect(deleteAgain.body).toHaveProperty('error', 'Item not found');
    });

    it('should return 404 when item does not exist', async () => {
      const response = await request(app).delete('/api/items/999999');
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Item not found');
    });

    it('should return 400 for invalid id', async () => {
      const response = await request(app).delete('/api/items/abc');
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Valid item ID is required');
    });
  });
});