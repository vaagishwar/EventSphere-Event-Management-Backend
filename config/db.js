const mongoose = require("mongoose");

const connectDB = async () => {
    // console.log("db running")

        const result = await mongoose.connect(process.env.MONGO_URL);
        if(result)
            console.log("Mongodb connected");
};

module.exports = connectDB;
