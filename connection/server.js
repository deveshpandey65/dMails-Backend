const express = require('express');
const app = express();
require("dotenv").config();
const http = require("http");
const cors = require("cors");
const serverless = require('serverless-http');
const port = process.env.PORT

app.use(express.json()); 

const server = http.createServer(app);

module.exports = { app, server };

module.exports.handler = serverless(app, { callbackWaitsForEmptyEventLoop: false });
