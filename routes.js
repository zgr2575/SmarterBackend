import express from 'express';
import { getTotalDiskSpace, getNetworkStats } from './utils.js';
import logger from './logger.js';
import config from './config.js';

const router = express.Router();

router.get("/d/data", async (req, res) => {
  try {
    const diskSpace = getTotalDiskSpace();
    const networkStats = await getNetworkStats();

    const serverStats = {
      server: "Smarter Back End v5",
      version: config.version,
      updateAvailable: config.updateAvailable,
      serverUptime: process.uptime(),
      serverMemory: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2) + " MB",
      serverId: Math.floor(Math.random() * 101),
      serverIdentity: "SBE SERVER",
      cpuUsage: process.cpuUsage(),
      diskSpace: diskSpace,
      networkStats: networkStats,
    };

    logger.info("[SMARTERBACKEND]: SERVER DATA HAS BEEN REQUESTED | STATUS: PACKAGING");
    res.json(serverStats);
    logger.info("[SMARTERBACKEND]: SERVER DATA HAS BEEN SENT | STATUS: SENT");
  } catch (error) {
    logger.error("Error in /d/data route:", error);
    res.status(500).send("Internal Server Error");
  }
});

logger.info("Routes.js has been initialized successfully");

export default router;
