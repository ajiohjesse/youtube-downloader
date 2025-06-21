import { eq } from "drizzle-orm";
import { db } from "../database/setup";
import { videoTable } from "../database/schema";
import { getOutput } from "../utils";

type DeleteVideoResult = {
  success: boolean;
  message: string;
  video?: any;
};

export const deleteVideo = async (id: number): Promise<DeleteVideoResult> => {
  try {
    // Start transaction to ensure atomicity
    return await db.transaction(async (tx) => {
      // Find video within transaction
      const video = await tx.query.videoTable.findFirst({
        where: eq(videoTable.id, id),
      });

      if (!video) {
        return {
          success: false,
          message: "Video not found",
        };
      }

      const filePath = getOutput(video.title);
      const file = Bun.file(filePath);
      const fileExists = await file.exists();

      // Delete from database first (will rollback if file deletion fails)
      await tx.delete(videoTable).where(eq(videoTable.id, id));

      // If file exists, attempt to delete it
      if (fileExists) {
        try {
          await file.delete();
        } catch (fileError) {
          console.error("Failed to delete video file:", filePath, fileError);
          // Throw error to trigger transaction rollback
          throw new Error(
            `Failed to delete video file: ${fileError instanceof Error ? fileError.message : "Unknown error"}`
          );
        }
      }

      return {
        success: true,
        message: fileExists
          ? "Video and file deleted successfully"
          : "Video deleted (file was already missing)",
        video,
      };
    });
  } catch (error) {
    console.error("Error deleting video:", { id }, error);

    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to delete video",
    };
  }
};
