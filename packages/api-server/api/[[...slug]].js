// Vercel serverless: run the bundled API server (dist/server.js) so all routes are handled.
// Build must run first: npm run build
const handler = require('../dist/server.js').default
module.exports = handler
