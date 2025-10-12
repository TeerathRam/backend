import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { handleError } from "./middlewares/error.middleware.js";
import logger from "./utils/logger.js";
import morgan from "morgan";

const app = express();

const morganFormat = ":method :url :status :response-time ms";

app.use(
  morgan(morganFormat, {
    stream: {
      write: (message) => {
        const logObject = {
          method: message.split(" ")[0],
          url: message.split(" ")[1],
          status: message.split(" ")[2],
          responseTime: message.split(" ")[3],
        };
        logger.info(JSON.stringify(logObject));
      },
    },
  })
);

// adding middleware
app.use(cors({ origin: process.env.CORS_ORIGIN, credentials: true })); // white listing the app to talk with frontend
app.use(express.json({ limit: "30kb" })); //set the size of data that could be send to server
app.use(express.urlencoded({ extended: true, limit: "30kb" }));
app.use(express.static("public"));
app.use(cookieParser());

// import routes

// import router from "./routes/user.routes.js";
import userRouter from "./routes/user.routes.js";
import videoRouter from "./routes/video.routes.js";
import tweetRouter from "./routes/tweet.routes.js";
import subscriptionRouter from "./routes/subscription.routes.js";
import playlistRouter from "./routes/playlist.routes.js";
import likeRouter from "./routes/like.routes.js";
import commentRouter from "./routes/comment.routes.js";

// routes declaration
app.use("/api/v1/users", userRouter); // integrate router with the app
app.use("/api/v1/videos", videoRouter);
app.use("/api/v1/tweets", tweetRouter);
app.use("/api/v1/subscriptions", subscriptionRouter);
app.use("/api/v1/playlists", playlistRouter);
app.use("/api/v1/likes", likeRouter);
app.use("/api/v1/comments", commentRouter);

app.use(handleError);
// http://localhost:8000/api/v1/users/register

export default app;
