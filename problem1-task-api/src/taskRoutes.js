const express = require("express");
const crypto = require("crypto");

const { tasks } = require("./store");
const { authenticate } = require("./authMiddleware");
const {
  STATUSES, validateNewTask, validateTaskPatch, parsePagination,
} = require("./validators");

const router = express.Router();

// Authentication is applied once, here, for every task route.
router.use(authenticate);

const toPublic = ({ id, title, status, ownerId, createdAt }) => ({ id, title, status, ownerId, createdAt });

/** Loads the task and enforces: 404 if missing, 403 unless owner or admin. */
function loadAuthorizedTask(req, res, next) {
  const task = tasks.get(req.params.id);
  if (!task) return res.status(404).json({ error: "Task not found" });
  if (task.ownerId !== req.user.id && req.user.role !== "admin") {
    return res.status(403).json({ error: "Forbidden" });
  }
  req.task = task;
  return next();
}

router.post("/", (req, res) => {
  const problem = validateNewTask(req.body);
  if (problem) return res.status(400).json({ error: problem });

  const task = {
    id: crypto.randomUUID(),
    ownerId: req.user.id,
    title: req.body.title.trim(),
    status: req.body.status || "todo",
    createdAt: new Date().toISOString(),
  };
  tasks.set(task.id, task);
  return res.status(201).json(toPublic(task));
});

router.get("/", (req, res) => {
  const { status } = req.query;
  if (status !== undefined && !STATUSES.includes(status)) {
    return res.status(400).json({ error: "status must be todo, doing or done" });
  }
  const paging = parsePagination(req.query);
  if (paging.error) return res.status(400).json({ error: paging.error });

  // Only the caller's own tasks, even for admins.
  const mine = [...tasks.values()]
    .filter((t) => t.ownerId === req.user.id && (status === undefined || t.status === status))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const start = (paging.page - 1) * paging.limit;
  return res.status(200).json({
    data: mine.slice(start, start + paging.limit).map(toPublic),
    page: paging.page,
    total: mine.length,
  });
});

router.patch("/:id", loadAuthorizedTask, (req, res) => {
  const problem = validateTaskPatch(req.body);
  if (problem) return res.status(400).json({ error: problem });

  if (req.body.title !== undefined) req.task.title = req.body.title.trim();
  if (req.body.status !== undefined) req.task.status = req.body.status;
  return res.status(200).json(toPublic(req.task));
});

router.delete("/:id", loadAuthorizedTask, (req, res) => {
  tasks.delete(req.task.id);
  return res.status(204).end();
});

module.exports = router;
