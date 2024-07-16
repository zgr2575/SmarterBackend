import express from "express";
import http from "node:http";
import { createBareServer } from "@tomphttp/bare-server-node";
import path from "node:path";
import cors from "cors";


import morgan from "morgan";
import rateLimit from "express-rate-limit";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import dotenv from "dotenv";
import config from "./config.js";
import logger from "./logger.js";
import routes from "./routes.js";

dotenv.config();

const __dirname = process.cwd();
const server = http.createServer();
const app = express(server);
const bareServer = createBareServer("/o/");
const onlineUsers = new Set();
let totalReqs = 0;

const webRoots = [
  { path: "/", file: "index.html" },
  { path: "/!", file: "backinfo.html" },
];

app.use(express.json({ limit: config.maxRequestSize }));
app.use(express.urlencoded({ extended: true, limit: config.maxRequestSize }));
app.use(cors());
app.use(express.static(path.join(__dirname, config.staticFolder)));

if (config.loggerEnabled) {
  app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));
}

app.use(routes);

app.set("trust proxy", true);

if (config.loggerEnabled) {
  app.use(
    morgan("combined", {
      stream: { write: (message) => logger.info(message.trim()) },
    }),
  );
}

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: "Too many requests, please try again later.",
  keyGenerator: (req) => req.ip,
});

app.use(limiter);
var codeverison = "6";
const swaggerOptions = {
  swaggerDefinition: {
    openapi: "3.0.0",
    info: {
      title: "SmarterBackend API",
      version: "1.0.0",
      description: "SmarterBackend API Endpoints",
    },
  },
  apis: ["./routes.js"],
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));

webRoots.forEach((route) => {
  app.get(route.path, (req, res) => {
    res.sendFile(path.join(__dirname, "static", route.file));
  });
});
app.use(routes);


logger.info("Routes.js has been initialized successfully");

logger.info(`
  +---------------------------------+
  |   S m a r t e r B a c k e n d   |
  +---------------------------------+
          A "Smarter" solution!
`);

server.on("connection", (socket) => {
  const userIdentifier = socket.remoteAddress;
  if (!onlineUsers.has(userIdentifier)) {
    onlineUsers.add(userIdentifier);

    logger.info(`User connected. Total unique online users: ${onlineUsers.size}`);

    logger.info(
      `User connected. Total unique online users: ${onlineUsers.size}`,
    );

  }
});

server.on("request", (req, res) => {
  if (bareServer.shouldRoute(req)) {
    bareServer.routeRequest(req, res);
  } else {
    app(req, res);
  }
});

server.on("upgrade", (req, socket, head) => {
  if (bareServer.shouldRoute(req)) {
    bareServer.routeUpgrade(req, socket, head);
  } else {
    socket.end();
  }
});

server.on("connection", () => {
  totalReqs++;
  logger.info(`Request received. Total requests: ${totalReqs}`);
});

server.on("listening", () => {
  logger.info(`[SBE]: LISTENING ON PORT ${config.port}`);
});

fetch(
  "https://raw.githubusercontent.com/zgr2575/SmarterBackend/main/version.txt",
)
  .then((response) => response.text())
  .then((data) => {
    const latestVersion = data.trim();
    if (latestVersion > codeverison) {
      logger.info(`[SBE]: A new version (${latestVersion}) is available.`);
    }
    logger.info(`[SBE-REMOTE] Current remote version: ${data}`);
  });
app.use((err, req, res, next) => {
  logger.error(err.message);
  res.status(500).json({ error: "Internal Server Error" });
});


server.listen(config.port);
