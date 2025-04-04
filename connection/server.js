const express = require('express');
require("dotenv").config();
const cors = require("cors");
const serverless = require('serverless-http');

const app = express();
app.use(cors());
app.use(express.json());

// Define a simple route for testing
app.get('/', (req, res) => {
    res.json({ message: "Server is running!" });
});

module.exports.handler = serverless(app);
