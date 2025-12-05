const app = require('../../src/server');

// Vercel serverless function handler
module.exports = (req, res) => {
  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Pass request to Express app
  app(req, res);
};
