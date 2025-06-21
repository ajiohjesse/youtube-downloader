import { eq } from "drizzle-orm";
import { videoTable } from "../database/schema";
import { db } from "../database/setup";
import { sendProgressEvent, sendVideoEvent } from "../sse";
import {
  COOKIES_FILE_PATH,
  VIDEO_STATUS,
  getOutput,
  sanitizeFilename,
} from "../utils";

type DownloadResult = {
  success: boolean;
  video?: any;
  message?: string;
};

const YT_DLP_ARGS_BEST = [
  "--progress-template",
  "PROGRESS: %(progress._percent_str)s of %(progress._total_bytes_str)s",
  "--cookies",
  COOKIES_FILE_PATH,
  "-f",
  "best[ext=mp4]/best",
  "--recode-video",
  "mp4",
  "--postprocessor-args",
  "ffmpeg:-c:v libx264 -crf 23 -c:a aac -b:a 128k",
] as const;

const YT_DLP_ARGS_AVERAGE = [
  "--progress-template",
  "PROGRESS: %(progress._percent_str)s of %(progress._total_bytes_str)s",
  "--cookies",
  COOKIES_FILE_PATH,
  "-f",
  "best[height<=1080][ext=mp4]/best[height<=720][ext=mp4]/best",
  "--recode-video",
  "mp4",
  "--postprocessor-args",
  "ffmpeg:-c:v libx264 -crf 28 -preset faster -c:a aac -b:a 96k",
] as const;

const getYtDlpArgs = (useHighQuality: boolean = true) =>
  useHighQuality ? YT_DLP_ARGS_BEST : YT_DLP_ARGS_AVERAGE;

const processProgressStream = async (
  reader: ReadableStreamDefaultReader<Uint8Array>,
  videoId: number
): Promise<void> => {
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Handle both \r (carriage return) and \n (newline)
      // Split on \r first to catch progress overwrites, then \n for regular lines
      const parts = buffer.split("\r");

      // If we have carriage returns, process each part
      if (parts.length > 1) {
        // Process all complete parts except the last
        for (let i = 0; i < parts.length - 1; i++) {
          const part = parts[i].trim();
          if (part && part.includes("PROGRESS")) {
            console.log("Sending progress (\\r):", part);
            sendProgressEvent(videoId, part);
          }
        }
        // Keep the last part as buffer
        buffer = parts[parts.length - 1];
      }

      // Also handle newline-separated content
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine && trimmedLine.includes("PROGRESS")) {
          console.log("Sending progress (\\n):", trimmedLine);
          sendProgressEvent(videoId, trimmedLine);
        }
      }
    }

    // Process any remaining content in buffer
    if (buffer.trim() && buffer.includes("PROGRESS")) {
      console.log("Sending final progress:", buffer.trim());
      sendProgressEvent(videoId, buffer.trim());
    }
  } finally {
    reader.releaseLock();
  }
};

const processErrorStream = async (
  reader: ReadableStreamDefaultReader<Uint8Array>
): Promise<void> => {
  const decoder = new TextDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const errorText = decoder.decode(value);
      console.error("yt-dlp error:", errorText);
    }
  } finally {
    reader.releaseLock();
  }
};

const downloadInBackground = async (
  videoId: number,
  title: string,
  url: string,
  useHighQuality: boolean
): Promise<void> => {
  const ytDlpArgs = getYtDlpArgs(useHighQuality);

  try {
    const proc = Bun.spawn(
      ["yt-dlp", ...ytDlpArgs, "--output", getOutput(title), url],
      {
        stdout: "pipe",
        stderr: "pipe",
      }
    );

    // Process streams concurrently
    const [stdoutPromise, stderrPromise] = await Promise.allSettled([
      processProgressStream(proc.stdout.getReader(), videoId),
      processErrorStream(proc.stderr.getReader()),
    ]);

    // Check if stream processing failed
    if (stdoutPromise.status === "rejected") {
      console.error("Error processing stdout:", stdoutPromise.reason);
      throw stdoutPromise.reason;
    }
    if (stderrPromise.status === "rejected") {
      console.error("Error processing stderr:", stderrPromise.reason);
    }

    await proc.exited;

    if (proc.exitCode !== 0) {
      console.error("Video download failed: Exit code", proc.exitCode);
      throw new Error(`Video download failed with exit code: ${proc.exitCode}`);
    }

    const videoFile = Bun.file(getOutput(title));
    const videoExists = await videoFile.exists();
    const videoSize = videoFile.size / (1024 * 1024);

    if (!videoExists) {
      console.error("Video file not found:", getOutput(title));
      throw new Error("Video file not found");
    }

    const [completedVideo] = await db
      .update(videoTable)
      .set({
        status: VIDEO_STATUS.completed,
        size: `${videoSize.toFixed(2)} MB`,
      })
      .where(eq(videoTable.id, videoId))
      .returning();

    console.log("Video download completed successfully:", { videoId, title });

    // Send video completion event
    sendVideoEvent(completedVideo);
  } catch (error) {
    console.error("Error downloading video:", { videoId, url, title }, error);

    const [video] = await db
      .update(videoTable)
      .set({ status: VIDEO_STATUS.error })
      .where(eq(videoTable.id, videoId))
      .returning();

    sendVideoEvent(video);
    throw error; // Re-throw to ensure proper error handling
  }
};

const getVideoTitle = async (url: string): Promise<string> => {
  try {
    const rawTitle =
      await Bun.$`yt-dlp --cookies "${COOKIES_FILE_PATH}" --get-title "${url}"`.text();
    return `${sanitizeFilename(rawTitle.trim())}_${Date.now()}.mp4`;
  } catch (error) {
    console.error("Failed to get video title:", error);
    throw new Error("Failed to get video details");
  }
};

const validateCookiesFile = async (): Promise<void> => {
  const cookiesFile = Bun.file(COOKIES_FILE_PATH);
  const cookiesExist = await cookiesFile.exists();

  if (!cookiesExist) {
    console.error("No cookies file found at:", COOKIES_FILE_PATH);
    throw new Error("No cookies file found");
  }
};

export const handleVideoDownload = async (
  url: string,
  useHighQuality: boolean
): Promise<DownloadResult> => {
  try {
    await validateCookiesFile();

    const title = await getVideoTitle(url);

    const [video] = await db
      .insert(videoTable)
      .values({ title, url })
      .returning();

    // Start download in background without awaiting
    downloadInBackground(
      video.id,
      video.title,
      video.url,
      useHighQuality
    ).catch((error) => {
      console.error("Background download failed:", error);
    });

    return {
      success: true,
      video,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error("handleVideoDownload failed:", message);

    return {
      success: false,
      message,
    };
  }
};
