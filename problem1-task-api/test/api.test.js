// End-to-end tests using Node's built-in test runner and fetch (no extra dependencies).
const test = require("node:test");
const assert = require("node:assert");

process.env.JWT_SECRET = "test-secret";
process.env.LOGIN_WINDOW_MS = "400"; // short window so the reset can be tested quickly
const app = require("../app");

let server;
let base;

test.before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  base = `http://127.0.0.1:${server.address().port}`;
});
test.after(() => server.close());
test.beforeEach(() => app.resetState());

async function call(method, path, { token, body } = {}) {
  const res = await fetch(base + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, headers: res.headers, json: text ? JSON.parse(text) : null };
}

async function registerAndLogin(email, role) {
  await call("POST", "/auth/register", { body: { email, password: "secret123", role } });
  const login = await call("POST", "/auth/login", { body: { email, password: "secret123" } });
  return login.json.token;
}

test("register: 201, 400, 409", async () => {
  assert.strictEqual((await call("POST", "/auth/register", { body: { email: "a@x.com", password: "secret123" } })).status, 201);
  assert.strictEqual((await call("POST", "/auth/register", { body: { email: "a@x.com", password: "secret123" } })).status, 409);
  assert.strictEqual((await call("POST", "/auth/register", { body: { email: "bad", password: "secret123" } })).status, 400);
});

test("login rate limit: 429 with Retry-After even for the right password, then resets", async () => {
  await call("POST", "/auth/register", { body: { email: "r@x.com", password: "secret123" } });
  for (let i = 0; i < 5; i++) {
    assert.strictEqual((await call("POST", "/auth/login", { body: { email: "r@x.com", password: "wrong" } })).status, 401);
  }
  const blocked = await call("POST", "/auth/login", { body: { email: "r@x.com", password: "secret123" } });
  assert.strictEqual(blocked.status, 429);
  assert.ok(blocked.headers.get("retry-after"));

  await new Promise((r) => setTimeout(r, 450));
  const ok = await call("POST", "/auth/login", { body: { email: "r@x.com", password: "secret123" } });
  assert.strictEqual(ok.status, 200);
});

test("tasks require a valid token; malformed tokens return 401 and do not crash", async () => {
  assert.strictEqual((await call("GET", "/tasks")).status, 401);
  assert.strictEqual((await call("GET", "/tasks", { token: "not.a.jwt" })).status, 401);
  assert.strictEqual((await call("GET", "/tasks", { token: "%%%garbage" })).status, 401);
  // server still alive
  assert.strictEqual((await call("GET", "/tasks")).status, 401);
});

test("task CRUD, pagination totals and ownership isolation", async () => {
  const alice = await registerAndLogin("alice@x.com");
  const bob = await registerAndLogin("bob@x.com");
  const admin = await registerAndLogin("admin@x.com", "admin");

  const created = [];
  for (let i = 0; i < 5; i++) {
    const r = await call("POST", "/tasks", { token: alice, body: { title: `t${i}`, status: i % 2 ? "done" : "todo" } });
    assert.strictEqual(r.status, 201);
    created.push(r.json);
  }
  assert.strictEqual((await call("POST", "/tasks", { token: alice, body: { title: "x", status: "bad" } })).status, 400);

  const page = await call("GET", "/tasks?limit=2&page=2", { token: alice });
  assert.strictEqual(page.status, 200);
  assert.strictEqual(page.json.total, 5);
  assert.strictEqual(page.json.page, 2);
  assert.strictEqual(page.json.data.length, 2);

  const done = await call("GET", "/tasks?status=done", { token: alice });
  assert.strictEqual(done.json.total, 2);

  // Bob sees none of Alice's tasks and cannot modify or delete them
  assert.strictEqual((await call("GET", "/tasks", { token: bob })).json.total, 0);
  assert.strictEqual((await call("PATCH", `/tasks/${created[0].id}`, { token: bob, body: { status: "done" } })).status, 403);
  assert.strictEqual((await call("DELETE", `/tasks/${created[0].id}`, { token: bob })).status, 403);

  // Admin may modify any task but still only lists their own
  assert.strictEqual((await call("PATCH", `/tasks/${created[0].id}`, { token: admin, body: { title: "renamed" } })).status, 200);
  assert.strictEqual((await call("GET", "/tasks", { token: admin })).json.total, 0);

  // Owner patch / delete / 404
  assert.strictEqual((await call("PATCH", `/tasks/${created[1].id}`, { token: alice, body: { status: "doing" } })).json.status, "doing");
  assert.strictEqual((await call("PATCH", `/tasks/${created[1].id}`, { token: alice, body: {} })).status, 400);
  assert.strictEqual((await call("DELETE", `/tasks/${created[1].id}`, { token: alice })).status, 204);
  assert.strictEqual((await call("DELETE", `/tasks/${created[1].id}`, { token: alice })).status, 404);
});
