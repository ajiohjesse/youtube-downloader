import { queryOptions } from "@tanstack/react-query";
import { fetcher } from "./fetcher";
import { type Video } from "./types";

export const videoQueryOptions = () => {
  return queryOptions({
    queryKey: ["videos"] as const,
    queryFn: async () => {
      return fetcher<{ data: Array<Video> }>("/api/videos");
    },
  });
};

export const cookiesQueryOptions = () => {
  return queryOptions({
    queryKey: ["cookies"] as const,
    queryFn: async () => {
      return fetcher<{ data: string }>("/api/cookies");
    },
  });
};
