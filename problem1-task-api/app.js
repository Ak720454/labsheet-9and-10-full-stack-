const express = require("express");

const authRoutes = require("./src/authRoutes");
const taskRoutes = require("./src/taskRoutes");
const store = require("./src/store");
const limiter = require("./src/rateLimiter");

const app = express();
app.use(express.json());

app.use("/auth", authRoutes);
app.use("/tasks", taskRoutes);

app.use((_req, res) => res.status(404).json({ error: "Not found" }));

// Central error handler (also turns malformed JSON bodies into 400).
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err && (err.type === "entity.parse.failed" || err instanceof SyntaxError)) {
    return res.status(400).json({ error: "Malformed JSON body" });
  }
  console.error(err);
  return res.status(500).json({ error: "Internal server error" });
});

// Handy for tests: wipe users, tasks and login-attempt counters.
app.resetState = () => {
  store.reset();
  limiter.reset();
};

// Only start listening when run directly (npm start), so tests can `require("./app")`.
if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`Task API listening on port ${port}`));
}

module.exports = app;
