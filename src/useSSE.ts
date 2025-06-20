import { useEffect } from "react";
import { progressSchema, videoSchema } from "./server/schemas";
import { QueryClient } from "@tanstack/react-query";
import { videoQueryOptions } from "./query-options";

export const useSSE = (queryClient: QueryClient) => {
  useEffect(() => {
    const eventSource = new EventSource(`/api/sse`);

    const handleVideoEvent = ({ data }: { data: any }) => {
      console.log({ sseVideoEvent: data });

      try {
        const jsonData = JSON.parse(data);
        const result = videoSchema.safeParse(jsonData);
        if (!result.success) {
          console.log("Invalid sse video data: ", result.error);
          return;
        }

        const video = result.data;
        queryClient.setQueryData(videoQueryOptions().queryKey, (old) => {
          if (!old) return { data: [{ ...video, progress: "" }] };

          // Check if video already exists
          const existingIndex = old.data.findIndex((d) => d.id === video.id);

          if (existingIndex !== -1) {
            // Update existing video, preserve its progress
            const updatedData = [...old.data];
            updatedData[existingIndex] = {
              ...video,
              progress: updatedData[existingIndex].progress || "",
            };
            return { data: updatedData };
          } else {
            // Add new video
            return {
              data: [...old.data, { ...video, progress: "" }],
            };
          }
        });

        queryClient.invalidateQueries(videoQueryOptions());
      } catch (error) {
        console.log("SSE error: ", error);
      }
    };

    const handleProgressEvent = ({ data }: { data: any }) => {
      console.log({ progressEvent: data });
      try {
        const jsonData = JSON.parse(data);
        const result = progressSchema.safeParse(jsonData);
        if (!result.success) {
          console.log("Invalid sse progress data: ", result.error);
          return;
        }

        const { videoId, progress } = result.data;
        queryClient.setQueryData(videoQueryOptions().queryKey, (old) => {
          if (!old) return undefined;

          const targetIndex = old.data.findIndex((d) => d.id === videoId);
          if (targetIndex === -1) return old; // Video not found, no update needed

          const updatedData = [...old.data];
          updatedData[targetIndex] = {
            ...updatedData[targetIndex],
            progress,
          };

          return { data: updatedData };
        });

        queryClient.invalidateQueries(videoQueryOptions());
      } catch (error) {
        console.log("SSE error: ", error);
      }
    };

    eventSource.addEventListener("video", handleVideoEvent);
    eventSource.addEventListener("progress", handleProgressEvent);

    return () => {
      eventSource.removeEventListener("video", handleVideoEvent);
      eventSource.removeEventListener("progress", handleProgressEvent);
      eventSource.close();
    };
  }, [queryClient]);
};
