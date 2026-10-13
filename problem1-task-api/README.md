# Problem 1: Secure Task Manager API

Express + bcrypt + JWT, all data in memory.

```bash
npm install            # also creates package-lock.json (commit it, CI uses `npm ci`)
set JWT_SECRET=your-long-random-secret      # PowerShell: $env:JWT_SECRET="..."
npm start              # http://localhost:3000
npm test
npm run lint
```

`app.js` exports the Express app (it only listens when run directly), so tests can `require("./app")`.

| Endpoint | Success | Errors |
|---|---|---|
| POST /auth/register | 201 | 400, 409 |
| POST /auth/login | 200 `{token}` (15 min) | 401, 429 + `Retry-After` |
| POST /tasks | 201 | 400, 401 |
| GET /tasks?status&page&limit | 200 `{data,page,total}` | 400, 401 |
| PATCH /tasks/:id | 200 | 400, 401, 403, 404 |
| DELETE /tasks/:id | 204 | 401, 403, 404 |

Design notes
- **Rate limit:** failed attempts are stored per email as timestamps; the count is checked *before* the password is verified, so a correct password is still rejected with 429 while locked out. Entries older than the window are dropped, so the counter resets after one minute.
- **Auth middleware:** `src/authMiddleware.js`, applied once with `router.use(authenticate)`. `jwt.verify` is in a try/catch, so malformed tokens give 401, never a crash.
- **Isolation:** `GET /tasks` filters by owner; PATCH/DELETE allow only the owner or an admin.
- If `status` is omitted when creating a task it defaults to `todo`; an invalid value is a 400.
