// netlify/functions/api.js
const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

// Add routes
app.get('/api/hello', (req, res) => {
    res.json({ message: 'Hello from Express on Netlify!' });
});

// Export only the handler
module.exports.handler = serverless(app);
