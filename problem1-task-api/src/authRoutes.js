const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const { users } = require("./store");
const { getJwtSecret, getTokenTtl } = require("./config");
const limiter = require("./rateLimiter");
const { validateRegister, normalizeEmail } = require("./validators");

const router = express.Router();
const BCRYPT_ROUNDS = 10;
// Used so that unknown emails cost the same time as known ones.
const DUMMY_HASH = bcrypt.hashSync("dummy-password", BCRYPT_ROUNDS);

router.post("/register", async (req, res, next) => {
  try {
    const problem = validateRegister(req.body);
    if (problem) return res.status(400).json({ error: problem });

    const email = normalizeEmail(req.body.email);
    if (users.has(email)) return res.status(409).json({ error: "Email already registered" });

    const user = {
      id: crypto.randomUUID(),
      email,
      passwordHash: await bcrypt.hash(req.body.password, BCRYPT_ROUNDS),
      role: req.body.role || "user",
    };
    // Re-check after the async hash so two simultaneous registrations cannot both win.
    if (users.has(email)) return res.status(409).json({ error: "Email already registered" });
    users.set(email, user);

    return res.status(201).json({ id: user.id, email: user.email, role: user.role });
  } catch (err) {
    return next(err);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body && req.body.email);
    const password = req.body && req.body.password;

    // 1) Rate limit check happens BEFORE the password is verified,
    //    so even a correct password is rejected while locked out.
    const state = limiter.check(email);
    if (state.limited) {
      res.set("Retry-After", String(state.retryAfterSeconds));
      return res.status(429).json({ error: "Too many failed attempts. Try again later." });
    }

    const user = users.get(email);
    const passwordOk =
      typeof password === "string" &&
      (await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH));

    if (!user || !passwordOk) {
      limiter.recordFailure(email);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign({ email: user.email, role: user.role }, getJwtSecret(), {
      subject: user.id,
      expiresIn: getTokenTtl(),
      algorithm: "HS256",
    });
    return res.status(200).json({ token });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
