const mongoose = require('mongoose');
require('dotenv').config()
console.log('Trying To Connect MongoDB')
const connectDB = async () => {
    mongoose.connect(process.env.MONGODB_URL,
        {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        }
    )
    .then(
        () => console.log("Connected to MongoDB")
    )
    .catch(
        err => console.log("ERROR :",err.message)
    )
};
connectDB()
module.exports = connectDB;
