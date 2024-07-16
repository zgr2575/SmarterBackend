import os from "os";
import { exec } from "child_process";
import { promisify } from "util";
import logger from "./logger.js";


const execPromise = promisify(exec);

export const getTotalDiskSpace = () => {
  const totalDiskSpaceInBytes = os.totalmem();

  const totalDiskSpaceInGB = (totalDiskSpaceInBytes / 1024 ** 3).toFixed(2) + " GB";

  return totalDiskSpaceInGB;
};

export const getNetworkStats = async () => {
  try {
    const { stdout } = await execPromise("netstat -e");
    const lines = stdout.split("\n");
    const networkStats = {
      sent: lines[2] ? lines[2].trim().split(/\s+/)[1] : "N/A",
      received: lines[2] ? lines[2].trim().split(/\s+/)[0] : "N/A",
    };
    return networkStats;
  } catch (error) {

    logger.error("Error fetching network stats: For full log see your log file");

    return {
      sent: "N/A",
      received: "N/A",
    };
  }
};

logger.info("Utils.js has been initialized successfully");
