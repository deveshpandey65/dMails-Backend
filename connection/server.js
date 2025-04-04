const express = require("express");
require("dotenv").config();
const cors = require("cors");

const authRoutes = require("../auth/login");
const OpenAI = require("openai");

const app = express();
app.use(express.json());
app.use(cors({
    origin: "http://localhost:3000",
    credentials: true,
}));

app.use("/auth", authRoutes);
const mongoose = require("mongoose");

mongoose
    .connect(process.env.MONGODB_URL, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    })
    .then(() => {
        console.log("✅ MongoDB connected successfully");
        app.listen(process.env.PORT || 5000, () => {
            console.log("🚀 Server started on port", process.env.PORT || 5000);
        });
    })
    .catch((err) => {
        console.error("❌ MongoDB connection error:", err.message);
    });

// AI ROUTES
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "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";
const client = new OpenAI({
    apiKey: OPENROUTER_API_KEY,
    baseURL: "https://openrouter.ai/api/v1",
});

app.post("/ai/summarize", async (req, res) => {
    console.log("Received Summarization Request:", req.body); // Debugging
    const { text } = JSON.parse(req.body);

    if (!text) {
        return res.status(400).json({ error: "Text input is required for summarization." });
    }

    try {
        const completion = await client.chat.completions.create({
            model: "openchat/openchat-7b:free",
            messages: [{ role: "user", content: `Summarize this email in maximum 12 words:\n${text}` }],
            temperature: 0.7,
            max_tokens: 100,
        });

        res.json({ summary: completion.choices[0].message.content });
    } catch (error) {
        console.error("Summarization Error:", error);
        res.status(500).json({ error: "Failed to summarize email." });
    }
});

app.post("/ai/suggestreply", async (req, res) => {
    const { text, sender, recipientId, reciever } = JSON.parse(req.body);

    if (!text) {
        return res.status(400).json({ error: "Text input is required for reply suggestions." });
    }

    try {
        const completion = await client.chat.completions.create({
            model: "openchat/openchat-7b:free",
            messages: [{
                role: "user", content: `Generate three possible replies just give the message without subject, separate each reply with ---:\n\n"${text}"\n\nSender: ${sender}\nReceiver: ${reciever}\nReceiver ID: ${recipientId}`
            }],
            temperature: 0.7,
            max_tokens: 200,
        });

        const replyText = completion.choices[0].message.content;
        const replyBlocks = replyText.split("---");
        const structuredReplies = replyBlocks.map(reply => ({
            subject: "No Subject",
            message: reply.trim()
        }));

        res.json({ replies: structuredReplies.slice(0, 3) });

    } catch (error) {
        console.error("Reply Suggestion Error:", error);
        res.status(500).json({ error: "Failed to generate suggested replies." });
    }
});

module.exports = { app };
