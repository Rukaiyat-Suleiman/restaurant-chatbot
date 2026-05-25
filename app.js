import express from "express";
import "dotenv/config";
import morgan from "morgan";
import { logger } from "./utils/logger.config.js";
import router from "./routes/mainRoute.js";
import { pool } from "./db/index.js";

const PORT = process.env.PORT || 2000;

const app = express();

const stream = {
  write: (message) => logger.info(message.trim()),
};

// Set up EJS view engine
app.set("view engine", "ejs");
app.set("views", "./views");

// Global middlewares
app.use(morgan("tiny", { stream }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

// Main routing
app.use("/", router);

// Test DB connection on startup
if (!process.env.JEST_WORKER_ID) {
  pool.query("SELECT 1")
    .then(() => {
      logger.info("Database connection test successful on startup.");
    })
    .catch((err) => {
      logger.error(`Database connection test failed on startup: ${err.message}`);
    });

  app.listen(PORT, () => {
    try {
      logger.info(`Listening on http://localhost:${PORT}`);
    } catch (err) {
      logger.info(`Server failed to startup: \n${err}`);
    }
  });
}

export default app;