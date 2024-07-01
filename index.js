import express from "express";
import basicAuth from "express-basic-auth";
import http from "node:http";
import { createBareServer } from "@tomphttp/bare-server-node";
import path from "node:path";
import cors from "cors";
import os from "os";
import util from "util";
import { promisify } from "util";
import { exec } from "child_process";

const __dirname = process.cwd();
const server = http.createServer();
const app = express(server);
const bareServer = createBareServer("/o/");
const PORT = process.env.PORT || 8080;
const onlineUsers = new Set();
let totalReqs = 0;
let v = 3;
let upd = false;
console.log(`
  +---------------------------------+
  |   S m a r t e r B a c k e n d   |
  +---------------------------------+
          A "Smarter" solution!
`);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(express.static(path.join(__dirname, "static")));

const execPromise = promisify(exec);

const getTotalDiskSpace = () => {
  const totalDiskSpaceInBytes = os.totalmem();
  const totalDiskSpaceInGB =
    (totalDiskSpaceInBytes / 1024 ** 3).toFixed(2) + " GB";
  return totalDiskSpaceInGB;
};

const getNetworkStats = async () => {
  try {
    const { stdout } = await execPromise("netstat -e");
    const lines = stdout.split("\n");
    const networkStats = {
      sent: lines[2] ? lines[2].trim().split(/\s+/)[1] : "N/A",
      received: lines[2] ? lines[2].trim().split(/\s+/)[0] : "N/A",
    };
    return networkStats;
  } catch (error) {
    console.error("Error fetching network stats:", error);
    return {
      sent: "N/A",
      received: "N/A",
    };
  }
};

server.on("connection", (socket) => {
  const userIdentifier = socket.remoteAddress;
  onlineUsers.add(userIdentifier);
  console.log(`User connected. Total unique online users: ${onlineUsers.size}`);
});

app.get("/d/data", async (req, res) => {
  const diskSpace = getTotalDiskSpace();
  const networkStats = await getNetworkStats();

  const serverStats = {
    server: "Smarter Back End v5",
    version: v,
    updateAvailable: upd,
    serverUptime: process.uptime(),
    serverMemory:
      (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2) + " MB",
    serverId: Math.floor(Math.random() * 101),
    serverIdentity: "SBE SERVER",
    cpuUsage: process.cpuUsage(),
    diskSpace: diskSpace,
    networkStats: networkStats,
  };

  console.log(
    "[SMARTERBACKEND]: SERVER DATA HAS BEEN REQUESTED | STATUS: PACKAGING",
  );
  res.json(serverStats);
  console.log("[SMARTERBACKEND]: SERVER DATA HAS BEEN SENT | STATUS: SENT");
});

app.use((req, res) => {
  res.status(404).send();
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send();
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

server.on("connection", (socket) => {
  totalReqs++;
  console.log(`Request received. Total requests: ${totalReqs}`);
});
server.on("listening", () => {
  console.log(`[SBE]: LISTENING ON PORT ${PORT}`);
});

server.listen({ port: PORT });
