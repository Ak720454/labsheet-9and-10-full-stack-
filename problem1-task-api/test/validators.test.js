const test = require("node:test");
const assert = require("node:assert");
const v = require("../src/validators");

test("register validation", () => {
  assert.strictEqual(v.validateRegister({ email: "a@b.com", password: "secret1" }), null);
  assert.ok(v.validateRegister({ email: "nope", password: "secret1" }));
  assert.ok(v.validateRegister({ email: "a@b.com", password: "12" }));
  assert.ok(v.validateRegister({ email: "a@b.com", password: "secret1", role: "root" }));
});

test("task validation", () => {
  assert.strictEqual(v.validateNewTask({ title: "x", status: "todo" }), null);
  assert.ok(v.validateNewTask({ title: "", status: "todo" }));
  assert.ok(v.validateNewTask({ title: "x", status: "later" }));
  assert.ok(v.validateTaskPatch({}));
  assert.strictEqual(v.validateTaskPatch({ status: "done" }), null);
});

test("pagination parsing", () => {
  assert.deepStrictEqual(v.parsePagination({}), { page: 1, limit: 10 });
  assert.deepStrictEqual(v.parsePagination({ page: "2", limit: "5" }), { page: 2, limit: 5 });
  assert.ok(v.parsePagination({ page: "0" }).error);
  assert.ok(v.parsePagination({ limit: "abc" }).error);
});
