import path from "node:path";
import fs from "node:fs";

export const DOWNLOADS_DIR = path.join(process.cwd(), "downloads");
export const COOKIES_FILE_PATH = path.join(process.cwd(), "cookies.txt");

export const VIDEO_STATUS = {
  pending: "pending",
  error: "error",
  completed: "completed",
} as const;

export const assetDownloadsDir = () => {
  if (!fs.existsSync(DOWNLOADS_DIR)) {
    fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
  }
};

export const readCookiesFile = async () => {
  const cookies = Bun.file(COOKIES_FILE_PATH);
  if (!cookies.exists) {
    return "No cookies found";
  }
  return cookies.text();
};

export const updateCookiesFile = async (content: string) => {
  await Bun.write(COOKIES_FILE_PATH, content);
};

export const sanitizeFilename = (filename: string) => {
  return filename
    .replace(/[^a-z0-9_\- ]/gi, "") // remove special chars
    .replace(/\s+/g, "_") // replace spaces with underscores
    .slice(0, 50); // trim to 50 chars
};

export const getOutput = (filename: string) => {
  return path.join(DOWNLOADS_DIR, filename);
};
