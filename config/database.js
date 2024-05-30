const mongoose = require("mongoose");
const { activityLogger, errorLogger } = require("../utils/logger");

const connectDatabase = () => {
  mongoose.connect(process.env.DB_URI).then(() => {
      console.log("Database connected Successfully...");
      activityLogger.info("Databse is connected successfully");
    })
    .catch((err) => {
      errorLogger.error(`Connection error occured due to:`,
      error
      );
      console.log("connection failed due to:"+err);
    });
};

module.exports = connectDatabase;
