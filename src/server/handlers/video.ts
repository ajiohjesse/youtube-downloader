import { eq } from "drizzle-orm";
import { videoTable } from "../database/schema";
import { db } from "../database/setup";
import {
  COOKIES_FILE_PATH,
  getOutput,
  sanitizeFilename,
  VIDEO_STATUS,
} from "../utils";
import { sendProgressEvent, sendVideoEvent } from "../sse";

const downloadInBackground = async (
  videoId: number,
  title: string,
  url: string
) => {
  try {
    const proc = Bun.spawn(
      [
        "yt-dlp",
        "--progress-template",
        "PROGRESS: %(progress._percent_str)s of %(progress._total_bytes_str)s",
        "--cookies",
        COOKIES_FILE_PATH,
        "-f",
        "best[height<=1080][ext=mp4]",
        "--output",
        getOutput(title),
        "--postprocessor-args",
        "ffmpeg:-c:a aac -b:a 128k",
        url,
      ],
      {
        stdout: "pipe",
        stderr: "pipe",
      }
    );

    const stderrReader = proc.stderr.getReader();
    try {
      while (true) {
        const { done, value } = await stderrReader.read();
        if (done) break;

        const errorText = new TextDecoder().decode(value);
        console.error("yt-dlp error:", errorText);
      }
    } catch (error) {
      console.error("Error reading stderr:", error);
      throw error;
    } finally {
      stderrReader.releaseLock();
    }

    const stdoutReader = proc.stdout.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { value, done } = await stdoutReader.read();
        if (done) {
          break;
        }
        buffer += decoder.decode(value);

        console.log("progress buffer: ", buffer);
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.includes("PROGRESS")) {
            sendProgressEvent(videoId, line);
          }
        }
      }
    } catch (error) {
      console.log("error reading stdout");
      throw error;
    } finally {
      stdoutReader.releaseLock();
    }

    await proc.exited;

    if (proc.exitCode !== 0) {
      console.log("Video download failed: Exit code", proc.exitCode);
      throw new Error("Video download failed");
    }

    await db
      .update(videoTable)
      .set({ status: VIDEO_STATUS.completed })
      .where(eq(videoTable.id, videoId));
  } catch (error) {
    console.log(
      "Error downloading video: ",
      { videoId, url, title },
      JSON.stringify(error)
    );

    const [video] = await db
      .update(videoTable)
      .set({ status: VIDEO_STATUS.error })
      .where(eq(videoTable.id, videoId))
      .returning();

    sendVideoEvent(video);
  }
};

export const handleVideoDownload = async (url: string) => {
  try {
    const cookiesFile = Bun.file(COOKIES_FILE_PATH);
    const cookiesExist = await cookiesFile.exists();
    if (!cookiesExist) {
      console.log("No cookies file found");
      throw new Error("No cookies file found");
    }

    let rawTitle: string;

    try {
      rawTitle =
        await Bun.$`yt-dlp --cookies "${COOKIES_FILE_PATH}" --get-title "${url}"`.text();
    } catch {
      return { success: false, message: "Failed to get video details" };
    }

    const title = `${sanitizeFilename(rawTitle)}_${Date.now()}.mp4`;

    const [video] = await db
      .insert(videoTable)
      .values({
        title,
        url,
      })
      .returning();

    downloadInBackground(video.id, video.title, video.url).catch();

    return {
      success: true,
      video,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : JSON.stringify(error),
    };
  }
};
