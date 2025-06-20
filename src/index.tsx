import { serve } from "bun";
import index from "./index.html";
import { createResponse } from "better-sse";
import { videoChannel } from "./server/sse";
import { z } from "zod/v4";
import { handleVideoDownload } from "./server/handlers/video";
import {
  assetDownloadsDir,
  getOutput,
  readCookiesFile,
  updateCookiesFile,
} from "./server/utils";
import { updateCookieSchema } from "./server/schemas";
import { db } from "./server/database/setup";
import { videoTable } from "./server/database/schema";
import { eq } from "drizzle-orm";

const server = serve({
  idleTimeout: 255,
  routes: {
    "/*": index,
    "/api/sse": {
      async GET(req) {
        return createResponse(req, (session) => {
          videoChannel.register(session);
        });
      },
    },
    "/api/cookies": {
      async GET() {
        const cookies = await readCookiesFile();
        return Response.json({
          success: true,
          data: cookies,
        });
      },

      async PUT(req) {
        const body = await req.json();
        const parsed = updateCookieSchema.safeParse(body);

        if (!parsed.success) {
          return Response.json(
            {
              success: false,
              message: "Missing cookies text",
            },
            { status: 400 }
          );
        }

        await updateCookiesFile(parsed.data.cookies);

        return Response.json({
          success: true,
        });
      },
    },
    "/api/videos": {
      async GET() {
        const videos = await db.query.videoTable.findMany();

        return Response.json(
          {
            success: true,
            data: videos,
          },
          { status: 200 }
        );
      },
    },
    "/api/video": {
      async POST(req) {
        const body = await req.json();
        const parsed = z
          .object({
            url: z.string(),
          })
          .safeParse(body);

        if (!parsed.success) {
          return Response.json(
            {
              success: false,
              message: "Provide a valid youtube url",
            },
            { status: 400 }
          );
        }

        const data = await handleVideoDownload(parsed.data.url);

        if (!data.success) {
          return Response.json(
            {
              success: false,
              message: data.message,
            },
            { status: 500 }
          );
        }

        return Response.json({
          message: "Video is processing",
          data: data.video,
        });
      },
    },
    "/api/download/:videoId": {
      async GET(req) {
        const videoId = req.params.videoId;

        console.log(req);
        const parsed = z.coerce.number().safeParse(videoId);

        if (!parsed.success) {
          return Response.json(
            {
              success: false,
              message: "Provide a valid video id",
            },
            { status: 400 }
          );
        }
        const video = await db.query.videoTable.findFirst({
          where: eq(videoTable.id, parsed.data),
        });

        if (!video) {
          return Response.json(
            {
              success: false,
              message: "Video not found",
            },
            { status: 404 }
          );
        }

        const file = Bun.file(getOutput(video.title));

        if (!file.exists) {
          return Response.json(
            {
              success: false,
              message: "Video not found",
            },
            { status: 404 }
          );
        }

        return new Response(file, {
          headers: {
            "Content-Type": file.type || "application/octet-stream",
            "Content-Disposition": `attachment; filename="${video.title}"`,
          },
        });
      },
    },
  },
  development: process.env.NODE_ENV !== "production" && {
    hmr: true,
    console: true,
  },
});

assetDownloadsDir();
console.log(`🚀 Server running at ${server.url}`);
