const express = require("express"); // ✅ This was missing
const { app } = require("../../connection/server");
const serverless = require("serverless-http");
const cors = require("cors");

app.use(cors({ origin: "*" }));

app.get("/", (req, res) => {
    res.send("API is working 🚀");
});

module.exports.handler = serverless(app);
