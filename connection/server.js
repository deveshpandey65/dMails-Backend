const express = require("express");
require("dotenv").config();
const cors = require("cors");
const serverless = require("serverless-http");

const app = express();

// 🔹 Apply CORS to all routes
app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

const handler = serverless(app);

module.exports = { app, handler }; // ✅ Export both
