import { createChannel } from "better-sse";
import { videoTable } from "./database/schema";

export const videoChannel = createChannel();

export const sendVideoEvent = (data: typeof videoTable.$inferSelect) => {
  videoChannel.broadcast(data, "video");
};

export const sendProgressEvent = (videoId: number, progress: string) => {
  videoChannel.broadcast({ videoId, progress }, "progress");
};
