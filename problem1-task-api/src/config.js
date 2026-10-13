// All configuration is read at call time so tests can change env vars safely.

let warned = false;

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (secret) return secret;
  if (!warned) {
    warned = true;
    console.warn("[warn] JWT_SECRET is not set; using an insecure development secret.");
  }
  return "insecure-dev-secret-do-not-use-in-production";
}

const getTokenTtl = () => process.env.TOKEN_TTL || "15m";
const getLoginWindowMs = () => Number(process.env.LOGIN_WINDOW_MS) || 60 * 1000;
const getMaxFailedLogins = () => Number(process.env.MAX_FAILED_LOGINS) || 5;

module.exports = { getJwtSecret, getTokenTtl, getLoginWindowMs, getMaxFailedLogins };
