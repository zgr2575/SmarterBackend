import express from "express";
import http from "node:http";
import { createBareServer } from "@tomphttp/bare-server-node";
import path from "node:path";
import cors from "cors";
import morgan from 'morgan';
import config from "./config.js";
import logger from "./logger.js";
import routes from "./routes.js";

const __dirname = process.cwd();
const server = http.createServer();
const app = express(server);
const bareServer = createBareServer("/o/");
const onlineUsers = new Set();
let totalReqs = 0;

app.use(express.json({ limit: config.maxRequestSize }));
app.use(express.urlencoded({ extended: true, limit: config.maxRequestSize }));
app.use(cors());
app.use(express.static(path.join(__dirname, config.staticFolder)));

if (config.loggerEnabled) {
  app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));
}

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

server.listen(config.port);
