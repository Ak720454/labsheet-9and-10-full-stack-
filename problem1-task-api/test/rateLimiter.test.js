const test = require("node:test");
const assert = require("node:assert");
const limiter = require("../src/rateLimiter");

test("allows 5 failures, blocks the 6th check, and resets after the window", () => {
  limiter.reset();
  const t0 = 1_000_000;
  for (let i = 0; i < 5; i++) {
    assert.strictEqual(limiter.check("a@b.com", t0 + i).limited, false);
    limiter.recordFailure("a@b.com", t0 + i);
  }
  const blocked = limiter.check("a@b.com", t0 + 10);
  assert.strictEqual(blocked.limited, true);
  assert.ok(blocked.retryAfterSeconds >= 1 && blocked.retryAfterSeconds <= 60);

  // Another email is unaffected
  assert.strictEqual(limiter.check("other@b.com", t0 + 10).limited, false);

  // After the one-minute window the counter is clear
  assert.strictEqual(limiter.check("a@b.com", t0 + 61_000).limited, false);
});
