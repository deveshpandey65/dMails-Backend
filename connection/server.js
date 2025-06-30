const express = require("express");
require("dotenv").config();
const cors = require("cors");

const authRoutes = require("../auth/login");



const app = express();
app.use(express.json());

app.use(cors({
    origin: "*",       
}));

app.use("/auth", authRoutes);


const Together = require("together-ai");
const together = new Together();



app.use(express.json());

app.post("/ai/summarize", async (req, res) => {
    const { text } = req.body;
    console.log("Received text for summarization:", text);

    if (!text) {
        return res.status(400).json({ error: "Text input is required for summarization." });
    }

    try {
        const response = await together.chat.completions.create({
            model: "deepseek-ai/DeepSeek-V3",
            messages: [
                {
                    role: "user",
                    content: `Summarize the following email in maximum 12 words.\nKeep it simple, clear, and to the point:\n${text}`,
                },
            ],
            temperature: 0.7,
            max_tokens: 100,
        });

        const summary = response.choices[0].message.content;
        res.json({ summary });
    } catch (error) {
        console.error("Together AI Summarization Error:", error);
        res.status(500).json({ error: "Failed to summarize email." });
    }
});



app.post("/ai/suggestreply", async (req, res) => {
    const { text, sender, recipientId, reciever } = req.body;

    if (!text) {
        return res.status(400).json({ error: "Text input is required for reply suggestions." });
    }

    try {
        const response = await together.chat.completions.create({
            model: "deepseek-ai/DeepSeek-V3", // Or any Together-supported chat model
            messages: [
                {
                    role: "user",
                    content: `Generate three possible replies. Just give the message (no subject), and separate each reply with "---":\n\n"${text}"\n\nSender: ${sender}\nReceiver: ${reciever}\nReceiver ID: ${recipientId}`,
                },
            ],
            temperature: 0.7,
            max_tokens: 200,
        });

        const replyText = response.choices[0].message.content;
        const replyBlocks = replyText.split("---");
        const structuredReplies = replyBlocks.map(reply => ({
            subject: "No Subject",
            message: reply.trim()
        }));

        res.json({ replies: structuredReplies.slice(0, 3) });

    } catch (error) {
        console.error("Together AI Reply Suggestion Error:", error);
        res.status(500).json({ error: "Failed to generate suggested replies." });
    }
    });
module.exports = { app };
