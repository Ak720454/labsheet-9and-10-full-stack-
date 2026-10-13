// In-memory storage (as required by the assignment).
const users = new Map(); // email -> { id, email, passwordHash, role }
const tasks = new Map(); // id -> { id, ownerId, title, status, createdAt }

function reset() {
  users.clear();
  tasks.clear();
}

module.exports = { users, tasks, reset };
