const { getLoginWindowMs, getMaxFailedLogins } = require("./config");

// email -> array of timestamps (ms) of failed login attempts
const failures = new Map();

function prune(key, now) {
  const windowMs = getLoginWindowMs();
  const recent = (failures.get(key) || []).filter((t) => now - t < windowMs);
  if (recent.length) failures.set(key, recent);
  else failures.delete(key);
  return recent;
}

/**
 * Called BEFORE the password is checked.
 * Returns { limited: false } or { limited: true, retryAfterSeconds }.
 */
function check(email, now = Date.now()) {
  const recent = prune(email, now);
  if (recent.length >= getMaxFailedLogins()) {
    const unblockAt = recent[0] + getLoginWindowMs();
    return { limited: true, retryAfterSeconds: Math.max(1, Math.ceil((unblockAt - now) / 1000)) };
  }
  return { limited: false };
}

function recordFailure(email, now = Date.now()) {
  const recent = prune(email, now);
  recent.push(now);
  failures.set(email, recent);
}

function reset() {
  failures.clear();
}

module.exports = { check, recordFailure, reset };
