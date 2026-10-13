// Alias so both require("./app") and require("./server") export the same Express app.
const app = require("./app");

if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`Task API listening on port ${port}`));
}

module.exports = app;
