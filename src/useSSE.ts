import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { videoQueryOptions } from "./query-options";

export const useSSE = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const eventSource = new EventSource(`/api/sse`);

    const handleVideoEvent = () => {
      queryClient.invalidateQueries(videoQueryOptions());
    };

    eventSource.addEventListener("video", handleVideoEvent);

    return () => {
      eventSource.removeEventListener("video", handleVideoEvent);
      eventSource.close();
    };
  }, [queryClient]);
};
