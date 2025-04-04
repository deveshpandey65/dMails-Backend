const express = require("express");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/user");
const { google } = require("googleapis");
require("dotenv").config();

const router = express.Router();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID); // Use env variable

// Google OAuth Login API
router.post("/google-login", async (req, res) => {
    try {
        console.log("Google Login Attempt");

        const { token, accessToken, refreshToken } = req.body;
        if (!token) {
            return res.status(400).json({ message: "Google token is missing" });
        }

        console.log("Received Token:", token); // Debugging

        // Verify Google ID token
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID, // Use environment variable
        });

        const payload = ticket.getPayload();
        console.log("Google Payload:", payload); // Debugging
        console.log("Access Token", accessToken )
        const { sub, name, email, picture } = payload; // `picture` instead of `profilePic`

        // Check if user exists
        let user = await User.findOne({ googleId: sub });

        if (!user) {
            user = new User({
                googleId: sub,
                name,
                email,
                accessToken,
                refreshToken,
                profilePic: picture, 

            });
            await user.save();
        }
        user.accessToken = accessToken;
        user.refreshToken = refreshToken;
        await user.save();
        console.log(user)
        


        // Generate JWT token
        const jwtToken = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, {
            expiresIn: "7d",
        });

        res.json({ token: jwtToken, user });
    } catch (error) {
        console.error("Google Login Error:", error.message);
        res.status(401).json({ message: "Invalid Google Token" });
    }
});

router.post("/logout", (req, res) => {
    res.json({ message: "Logged out successfully" });
});


router.get("/emails", async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1]?.replace(/^"|"$/g, '');
        if (!token) {
            return res.status(401).json({ error: "Unauthorized, token missing" });
        }

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            return res.status(403).json({ error: "Invalid or expired JWT token" });
        }

        const user = await User.findById(decoded.id);
        if (!user || !user.accessToken || !user.refreshToken) {
            return res.status(401).json({ error: "Unauthorized, missing Google access or refresh token" });
        }

        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.REDIRECT_URI
        );

        oauth2Client.setCredentials({
            access_token: user.accessToken,
            refresh_token: user.refreshToken,
        });

        // Refresh access token if expired
        try {
            const { token } = await oauth2Client.getAccessToken();
            if (!token) {
                throw new Error("Failed to refresh token");
            }
            user.accessToken = token;
            await user.save();
            oauth2Client.setCredentials({ access_token: token });
        } catch (refreshError) {
            console.error("❌ Google Token Refresh Error:", refreshError);
            return res.status(401).json({ error: "Google access token expired. Please re-login." });
        }

        const gmail = google.gmail({ version: "v1", auth: oauth2Client });

        // Get the date 7 days ago
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const formattedDate = sevenDaysAgo.toISOString().split("T")[0]; // YYYY-MM-DD

        // Fetch all emails from the last 7 days (read & unread)
        const response = await gmail.users.messages.list({
            userId: "me",
            q: `after:${formattedDate}`, // Fetch all emails
        });

        const messages = response.data.messages || [];

        const categorizedEmails = {
            unread: [],
            read: [],
        };

        const emails = await Promise.all(
            messages.map(async (msg) => {
                const email = await gmail.users.messages.get({ userId: "me", id: msg.id });

                // Extract sender email
                const headers = email.data.payload.headers;
                const fromHeader = headers.find(header => header.name === "From");
                const senderEmail = fromHeader ? fromHeader.value.match(/<([^>]+)>/)?.[1] || fromHeader.value : "Unknown";

                // ✅ Check if email is read/unread
                const isUnread = email.data.labelIds.includes("UNREAD");

                const emailData = {
                    id: email.data.id,
                    sender: senderEmail,
                    snippet: email.data.snippet,
                    body: email?.data?.body || "No content",
                };

                if (isUnread) {
                    categorizedEmails.unread.push(emailData);
                } else {
                    categorizedEmails.read.push(emailData);
                }
            })
        );

        res.json(categorizedEmails);
    } catch (error) {
        console.error("❌ Failed to fetch emails:", error);
        res.status(500).json({ error: "Failed to fetch emails", details: error.message });
    }
});


router.post("/emails/markAsRead", async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1]?.replace(/^"|"$/g, '');
        if (!token) {
            return res.status(401).json({ error: "Unauthorized, token missing" });
        }

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            return res.status(403).json({ error: "Invalid or expired JWT token" });
        }

        const user = await User.findById(decoded.id);
        if (!user || !user.accessToken || !user.refreshToken) {
            return res.status(401).json({ error: "Unauthorized, missing Google access or refresh token" });
        }

        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.REDIRECT_URI
        );
        oauth2Client.setCredentials({
            access_token: user.accessToken,
            refresh_token: user.refreshToken,
        });

        // ✅ Refresh access token if expired
        try {
            const { token } = await oauth2Client.getAccessToken();
            if (!token) {
                throw new Error("Failed to refresh token");
            }
            user.accessToken = token;
            await user.save();
            oauth2Client.setCredentials({ access_token: token });
        } catch (refreshError) {
            console.error("❌ Google Token Refresh Error:", refreshError);
            return res.status(401).json({ error: "Google access token expired. Please re-login." });
        }

        const gmail = google.gmail({ version: "v1", auth: oauth2Client });

        // ✅ Get email IDs from request body
        const { emailIds } = req.body;
        if (!emailIds || !Array.isArray(emailIds) || emailIds.length === 0) {
            return res.status(400).json({ error: "Invalid request, provide an array of email IDs" });
        }

        // ✅ Mark emails as read by removing "UNREAD" label
        await Promise.all(
            emailIds.map(async (emailId) => {
                await gmail.users.messages.modify({
                    userId: "me",
                    id: emailId,
                    requestBody: {
                        removeLabelIds: ["UNREAD"], // ✅ Marks email as read
                    },
                });
            })
        );

        res.json({ message: "Emails marked as read successfully" });
    } catch (error) {
        console.error("❌ Failed to mark emails as read:", error);
        res.status(500).json({ error: "Failed to mark emails as read", details: error.message });
    }
});



module.exports = router;
