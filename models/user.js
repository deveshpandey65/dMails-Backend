const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
    googleId: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    name: { type: String },
    profilePic: { type: String },
    accessToken : { type: String },
    refreshToken: { type: String },
});
const user= mongoose.models.User||mongoose.model("User", UserSchema);
module.exports = user;
