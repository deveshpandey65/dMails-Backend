const { app } = require("../../connection/server");
const serverless = require("serverless-http");

module.exports.handler = serverless(app);
