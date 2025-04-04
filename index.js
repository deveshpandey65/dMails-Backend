// const express= require('express');
// const app=require('./connection/server')
// const db= require('./connection/db')
// const User = require('./models/user');
// const authRoutes = require("./auth/login"); 
// const cors = require('cors')
// app.use(cors() )
// app.use('/auth', authRoutes);
// const OpenAI= require('openai')

// //  "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";
// const OPENROUTER_API_KEY = `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`
// const client = new OpenAI({
//     apiKey: OPENROUTER_API_KEY,
//     baseURL: "https://openrouter.ai/api/v1",
// });

// app.post("/ai/summarize", async (req, res) => {
//     const { text } = req.body;

//     if (!text) {
//         return res.status(400).json({ error: "Text input is required for summarization." });
//     }

//     try {
//         const completion = await client.chat.completions.create({
//             model: "openchat/openchat-7b:free",
//             messages: [{ role: "user", content: `Summarize this email in maximum 12 words:\n${text}` }],
//             temperature: 0.7,
//             max_tokens: 100,
//             extra_headers: {
//                 "HTTP-Referer": "<YOUR_SITE_URL>", // Optional, add your actual site URL
//                 "X-Title": "<YOUR_SITE_NAME>", // Optional, add your actual site title
//             },
//         });

//         res.json({ summary: completion.choices[0].message.content });

//     } catch (error) {
//         console.error("OpenRouter API Summarization Error:", error);
//         res.status(500).json({ error: "Failed to summarize email." });
//     }
// });


// app.post("/ai/suggestreply", async (req, res) => {
//     const { text, sender, recipientId, reciever } = req.body;

//     if (!text) {
//         return res.status(400).json({ error: "Text input is required for reply suggestions." });
//     }

//     try {
//         const completion = await client.chat.completions.create({
//             model: "openchat/openchat-7b:free",
//             messages: [{
//                 role: "user", content: `Generate three possible replies  just give the message without subject seprate each reply with --- dont add reply number for this email  :\n\n"${text}"\n\nSender: ${sender}\nReceiver Name: ${reciever}\n reciever id:${recipientId}` 
//             }],
//             temperature: 0.7,
//             max_tokens: 200,
//             extra_headers: {
//                 "HTTP-Referer": "<YOUR_SITE_URL>",  // Optional
//                 "X-Title": "<YOUR_SITE_NAME>",  // Optional
//             },
//         });

//         // Ensure the response is formatted correctly
//         const replyText = completion.choices[0].message.content;
//         const replyBlocks = replyText.split("---");  
//         const structuredReplies = replyBlocks.map(reply => {
//             const lines = reply.trim().split("\n").filter(line => line.trim() !== "");
//             return {
//                 subject: lines.find(line => line.startsWith("Subject:")) || "No Subject",
//                 message: lines.slice(1).join("\n")  // Everything except subject
//             };
//         });
//         console.log(structuredReplies)
//         res.json({ replies: structuredReplies.slice(0, 3) });

//     } catch (error) {
//         console.error("OpenRouter API Reply Suggestion Error:", error);
//         res.status(500).json({ error: "Failed to generate suggested replies." });
//     }
// });








// // app.post("/ai/suggestreply", async (req, res) => {
// //     const { text, sender, recipientId ,reciever } = req.body;

// //     if (!text) {
// //         return res.status(400).json({ error: "Text input is required for reply suggestions." });
// //     }

// //     try {
// //         const completion = await client.chat.completions.create({
// //             model: "openchat/openchat-7b:free",
// //             messages: [{
// //                 role: "user", content: `Generate three possible replies for this email:\n\n"${text}"\n\nSender: ${sender}\nReceiver Name: ${reciever}\n reciever id:${recipientId}`
// //             }],
// //             temperature: 0.7,
// //             max_tokens: 200,
// //             extra_headers: {
// //                 "HTTP-Referer": "<YOUR_SITE_URL>",  // Optional
// //                 "X-Title": "<YOUR_SITE_NAME>",  // Optional
// //             },
// //         });

// //         // Ensure the response is formatted correctly
// //         const replyText = completion.choices[0].message.content;
// //         const replyBlocks = replyText.split("---");  // Split replies by delimiter

// //         const structuredReplies = replyBlocks.map(reply => {
// //             const lines = reply.trim().split("\n").filter(line => line.trim() !== "");
// //             return {
// //                 subject: lines.find(line => line.startsWith("Subject:")) || "No Subject",
// //                 message: lines.slice(1).join("\n")  // Everything except subject
// //             };
// //         });
// //         console.log(structuredReplies)
// //         res.json({ replies: structuredReplies.slice(0, 3) });

// //     } catch (error) {
// //         console.error("OpenRouter API Reply Suggestion Error:", error);
// //         res.status(500).json({ error: "Failed to generate suggested replies." });
// //     }
// // });

