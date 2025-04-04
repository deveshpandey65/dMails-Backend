const { app } = require("../../connection/server");
const serverless = require("serverless-http");
const cors = require("cors");
app.use(cors({ origin: "http://localhost:3000", credentials: true }));
app.get("/", (req, res) => {
    res.send("API is working 🚀");
});

module.exports.handler = serverless(app);
