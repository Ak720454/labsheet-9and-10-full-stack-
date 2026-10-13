const STATUSES = ["todo", "doing", "done"];
const ROLES = ["user", "admin"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isNonEmptyString = (v) => typeof v === "string" && v.trim().length > 0;

function normalizeEmail(email) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

function validateRegister(body) {
  const { email, password, role } = body || {};
  if (!isNonEmptyString(email) || !EMAIL_RE.test(email.trim())) return "A valid email is required";
  if (typeof password !== "string" || password.length < 6) return "Password must be at least 6 characters";
  if (role !== undefined && !ROLES.includes(role)) return 'role must be "user" or "admin"';
  return null;
}

function validateNewTask(body) {
  const { title, status } = body || {};
  if (!isNonEmptyString(title)) return "title is required";
  if (status !== undefined && !STATUSES.includes(status)) return "status must be todo, doing or done";
  return null;
}

function validateTaskPatch(body) {
  const { title, status } = body || {};
  if (title === undefined && status === undefined) return "Provide title and/or status";
  if (title !== undefined && !isNonEmptyString(title)) return "title must be a non-empty string";
  if (status !== undefined && !STATUSES.includes(status)) return "status must be todo, doing or done";
  return null;
}

/** Parse ?page & ?limit. Returns { error } or { page, limit }. */
function parsePagination(query) {
  const page = query.page === undefined ? 1 : Number(query.page);
  const limit = query.limit === undefined ? 10 : Number(query.limit);
  if (!Number.isInteger(page) || page < 1) return { error: "page must be a positive integer" };
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) return { error: "limit must be an integer from 1 to 100" };
  return { page, limit };
}

module.exports = {
  STATUSES, ROLES, normalizeEmail,
  validateRegister, validateNewTask, validateTaskPatch, parsePagination,
};
