const express = require("express");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/user");
const { google } = require("googleapis");
require("dotenv").config();

const router = express.Router();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Google OAuth Login API
router.post("/google-login", async (req, res) => {
    console.log("Google Login Attempt 1");
    try {
        console.log("Google Login Attempt 2");
        
        const body = JSON.parse(req.body || "{}");
        const { token, accessToken, refreshToken } =body;
        console.log('Token', token)
        console.log('Access Token', accessToken)
        console.log('Refresh Token', refreshToken)
        if (!token) {
            return res.status(400).json({ message: "Google token is missing" });
        }

        console.log("Received Token:", token); // Debugging

        // Verify Google ID token
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID, 
        });

        const payload = ticket.getPayload();
        console.log("Google Payload:", payload); // Debugging
        console.log("Access Token", accessToken)
        const { sub, name, email, picture } = payload; 
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
})


router.get("/emails", async (req, res) => {
    try {
        console.log("📨 Fetching Emails...");

        const authHeader = req.headers.authorization;
        const token = authHeader?.split(" ")[1]?.replace(/^"|"$/g, "");

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

        // Refresh access token
        try {
            const accessTokenResponse = await oauth2Client.getAccessToken();
            if (!accessTokenResponse?.token) {
                throw new Error("Failed to refresh token");
            }

            user.accessToken = accessTokenResponse.token;
            await user.save();
            oauth2Client.setCredentials({ access_token: accessTokenResponse.token });
        } catch (refreshError) {
            console.error("❌ Google Token Refresh Error:", refreshError);
            return res.status(401).json({ error: "Google access token expired. Please re-login." });
        }

        const gmail = google.gmail({ version: "v1", auth: oauth2Client });

        // Get recent 7 days' emails (limit results for performance)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const formattedDate = sevenDaysAgo.toISOString().split("T")[0];

        const { data: listData } = await gmail.users.messages.list({
            userId: "me",
            q: `after:${formattedDate}`,
            maxResults: 15, 
        });

        const messages = listData.messages || [];

        const emailPromises = messages.map(async (msg) => {
            const { data: fullEmail } = await gmail.users.messages.get({ userId: "me", id: msg.id });

            const headers = fullEmail.payload.headers || [];
            const fromHeader = headers.find(header => header.name === "From");
            const senderEmail = fromHeader
                ? fromHeader.value.match(/<([^>]+)>/)?.[1] || fromHeader.value
                : "Unknown";

            const isUnread = fullEmail.labelIds?.includes("UNREAD");

            const emailData = {
                id: fullEmail.id,
                sender: senderEmail,
                snippet: fullEmail.snippet,
                body: fullEmail.payload?.body || "No content", // or parse MIME parts
            };

            return { isUnread, emailData };
        });

        const emailResults = await Promise.all(emailPromises);

        const categorizedEmails = {
            unread: [],
            read: [],
        };

        emailResults.forEach(({ isUnread, emailData }) => {
            if (isUnread) {
                categorizedEmails.unread.push(emailData);
            } else {
                categorizedEmails.read.push(emailData);
            }
        });

        return res.json(categorizedEmails);
    } catch (error) {
        console.error("❌ Failed to fetch emails:", error);
        res.status(500).json({ error: "Failed to fetch emails", details: error.message });
    }
});


router.post("/emails/markAsRead", async (req, res) => {
    try {
        console.log("📩 Marking emails as read...");

        // ✅ Extract JWT from Authorization header
        const token = req.headers.authorization?.split(" ")[1]?.replace(/^"|"$/g, "");
        if (!token) {
            return res.status(401).json({ error: "Unauthorized: JWT token missing" });
        }

        // ✅ Verify JWT token
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            console.error("❌ JWT verification failed:", err.message);
            return res.status(403).json({ error: "Invalid or expired JWT token" });
        }

        // ✅ Find user by decoded ID
        const user = await User.findById(decoded.id);
        if (!user || !user.accessToken || !user.refreshToken) {
            return res.status(401).json({ error: "Unauthorized: Missing Google access or refresh token" });
        }

        // ✅ Set up OAuth2 client
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.REDIRECT_URI
        );

        oauth2Client.setCredentials({
            access_token: user.accessToken,
            refresh_token: user.refreshToken,
        });

        // ✅ Try to refresh access token
        try {
            const { token: newAccessToken } = await oauth2Client.getAccessToken();
            if (!newAccessToken) {
                throw new Error("Failed to refresh access token");
            }

            // Update user's access token
            user.accessToken = newAccessToken;
            await user.save();
            oauth2Client.setCredentials({ access_token: newAccessToken });

        } catch (refreshError) {
            console.error("❌ Google Token Refresh Error:", refreshError.message);
            return res.status(401).json({ error: "Google token expired or invalid. Please re-login." });
        }

        // ✅ Gmail API setup
        const gmail = google.gmail({ version: "v1", auth: oauth2Client });

        // ✅ Validate request body
        const body = JSON.parse(req.body || "{}");
        const { emailIds } = body;
        console.log( emailIds );
        if (!Array.isArray(emailIds) || emailIds.length === 0) {
            return res.status(400).json({ error: "Invalid request: Provide a non-empty array of email IDs" });
        }

        // ✅ Mark emails as read
        console.log(emailIds)
        await Promise.all(
            emailIds.map(async (emailId) => {
                await gmail.users.messages.modify({
                    userId: "me",
                    id: emailId,
                    requestBody: {
                        removeLabelIds: ["UNREAD"],
                    },
                });
            })
        );

        console.log("✅ Emails marked as read:", emailIds.length);
        res.json({ message: "Emails marked as read successfully" });

    } catch (error) {
        console.error("❌ Failed to mark emails as read:", error);
        res.status(500).json({
            error: "Failed to mark emails as read",
            details: error.message || "Unexpected error",
        });
    }
});



module.exports = router;
