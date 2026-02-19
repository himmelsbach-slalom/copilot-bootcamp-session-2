import React, { useState, useEffect, useCallback } from 'react';
import './App.css';

function App() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      if (searchQuery.trim()) {
        params.set('search', searchQuery.trim());
      }

      params.set('sortBy', sortBy);
      params.set('sortOrder', sortOrder);

      const response = await fetch(`/api/tasks?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const result = await response.json();
      setTasks(result);
      setError(null);
    } catch (err) {
      setError('Failed to fetch tasks: ' + err.message);
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, sortBy, sortOrder]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const resetForm = () => {
    setName('');
    setStartDate('');
    setDueDate('');
    setEditingTaskId(null);
  };

  const handleSubmitTask = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
      return;
    }

    try {
      const payload = {
        name,
        startDate,
        dueDate,
      };

      const requestConfig = {
        method: editingTaskId ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      };

      const targetUrl = editingTaskId ? `/api/tasks/${editingTaskId}` : '/api/tasks';

      const response = await fetch(targetUrl, requestConfig);

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        const errorMessage = errorBody?.error || 'Failed to save task';
        throw new Error(errorMessage);
      }

      await fetchTasks();
      resetForm();
      setError(null);
    } catch (err) {
      setError('Error saving task: ' + err.message);
      console.error('Error saving task:', err);
    }
  };

  const handleEditTask = (task) => {
    setEditingTaskId(task.id);
    setName(task.name || '');
    setStartDate(task.startDate || '');
    setDueDate(task.dueDate || '');
  };

  const handleToggleComplete = async (task) => {
    try {
      const response = await fetch(`/api/tasks/${task.id}/complete`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ completed: !task.completed }),
      });

      if (!response.ok) {
        throw new Error('Failed to update completion state');
      }

      await fetchTasks();
      setError(null);
    } catch (err) {
      setError('Error updating completion state: ' + err.message);
      console.error('Error updating completion state:', err);
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete task');
      }

      await fetchTasks();
      setError(null);
    } catch (err) {
      setError('Error deleting task: ' + err.message);
      console.error('Error deleting task:', err);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearchQuery(searchInput);
  };

  return (
    <div className="App">
      <header className="App-header">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <span>Home</span>
          <span aria-hidden="true">/</span>
          <span>Tasks</span>
        </nav>
        <h1>Neon To-Do App</h1>
        <p>Track, plan, and complete your tasks</p>
      </header>

      <main>
        <section className="task-form-section">
          <h2>{editingTaskId ? 'Edit Task' : 'Add Task'}</h2>
          <form className="task-form" onSubmit={handleSubmitTask}>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Task name"
              aria-label="Task name"
            />
            <div className="form-field">
              <label htmlFor="start-date-input" className="field-label">
                Start Date
              </label>
              <input
                id="start-date-input"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                aria-label="Start date"
              />
            </div>
            <div className="form-field">
              <label htmlFor="due-date-input" className="field-label">
                Due Date
              </label>
              <input
                id="due-date-input"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                aria-label="Due date"
              />
            </div>
            <button type="submit">{editingTaskId ? 'Update Task' : 'Add Task'}</button>
            {editingTaskId && (
              <button type="button" className="secondary-btn" onClick={resetForm}>
                Cancel
              </button>
            )}
          </form>
        </section>

        <section className="filters-section">
          <h2>Search and Sort</h2>
          <form className="filters-grid" onSubmit={handleSearchSubmit}>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search tasks (supports * and ?)"
              aria-label="Search tasks"
            />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              aria-label="Sort by"
            >
              <option value="name">Task Name</option>
              <option value="startDate">Start Date</option>
              <option value="dueDate">Due Date</option>
            </select>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              aria-label="Sort order"
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
            <button type="submit">Apply</button>
            <button
              type="button"
              className="secondary-btn"
              onClick={() => {
                setSearchInput('');
                setSearchQuery('');
              }}
            >
              Clear
            </button>
          </form>
        </section>

        <section className="tasks-section">
          <h2>Tasks</h2>
          {loading && <p>Loading data...</p>}
          {error && <p className="error">{error}</p>}
          {!loading && !error && (
            <ul>
              {tasks.length > 0 ? (
                tasks.map((task) => (
                  <li key={task.id} className={task.completed ? 'task-completed' : ''}>
                    <div className="task-main">
                      <label>
                        <input
                          type="checkbox"
                          checked={task.completed}
                          onChange={() => handleToggleComplete(task)}
                          aria-label={`Mark ${task.name} completed`}
                        />
                        <span className="task-name">{task.name}</span>
                      </label>
                      <p className="task-dates">
                        Start: {task.startDate || 'Not set'} | Due: {task.dueDate || 'Not set'}
                      </p>
                    </div>
                    <div className="task-actions">
                      <button type="button" className="secondary-btn" onClick={() => handleEditTask(task)}>
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="delete-btn"
                        type="button"
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))
              ) : (
                <p>No tasks found. Add one to get started.</p>
              )}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;