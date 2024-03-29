const express = require("express");
const userRoute = require("./routes/userRoute");
const dummyRoute = require("./routes/dummyRoute");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");
const connectDatabase = require("./config/database");
const errorMiddleware = require("./middlewares/error");
const groupRoute = require("./routes/groupRoute");
const cors = require("cors");
const { activityLogger, errorLogger } = require('./utils/logger');


dotenv.config({ path: "./config/config.env" });
const app = express();
const PORT = process.env.PORT;

//Connecting Database
connectDatabase();

// Applying Middlewares
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
// app.use(cors());
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "http://localhost:5173");
  res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  res.header("Access-Control-Allow-Credentials", true);
  next();
});

// Routes
app.use("/user", userRoute);
app.use("/group", groupRoute);
app.use("/dummy", dummyRoute);



app.use(errorMiddleware)

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  activityLogger.info(`Server is running on http://localhost:${PORT}`);
});



