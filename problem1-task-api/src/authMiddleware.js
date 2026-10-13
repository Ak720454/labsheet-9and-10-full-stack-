const jwt = require("jsonwebtoken");
const { getJwtSecret } = require("./config");

/**
 * Reusable authentication middleware.
 * Missing, malformed, tampered or expired tokens all produce 401.
 * jwt.verify is wrapped in try/catch so a bad token can never crash the server.
 */
function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (typeof header !== "string") {
    return res.status(401).json({ error: "Missing token" });
  }
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Malformed Authorization header" });
  }
  try {
    const payload = jwt.verify(token, getJwtSecret(), { algorithms: ["HS256"] });
    req.user = { id: payload.sub, role: payload.role, email: payload.email };
    return next();
  } catch (_err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

module.exports = { authenticate };
