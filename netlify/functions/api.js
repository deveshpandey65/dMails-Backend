const { app } = require("../../connection/server");
const serverless = require("serverless-http");
const cors = require("cors");

// Enable CORS for all origins
app.use(cors({ origin: "*" }));
app.use(express.json());
// Test route
app.get("/", (req, res) => {
    res.send("API is working 🚀");
});

// Export as a serverless handler
module.exports.handler = serverless(app);
