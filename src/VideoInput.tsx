import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type FormEvent } from "react";
import { type Video } from "./types";
import { videoQueryOptions } from "./query-options";

export default function VideoInput() {
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationKey: ["video-request"],
    mutationFn: async (url: string) => {
      const res = await fetch(`/api/video`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      });

      if (!res.ok) {
        const errorData = (await res.json()) as { message: string };
        throw new Error(errorData.message);
      }
      return res.json() as Promise<Omit<Video, "progress">>;
    },
    onSuccess: (data) => {
      // queryClient.setQueryData(videoQueryOptions().queryKey, (old) => {
      //   if (!old) return { data: [{ ...data, progress: "" }] };
      //   return { data: [...old.data, { ...data, progress: "" }] };
      // });
      queryClient.invalidateQueries(videoQueryOptions());
    },
    onError: (error) => {
      alert(error.message);
    },
  });

  const handleVideo = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (isPending) return;

    try {
      const form = e.currentTarget;
      const formData = new FormData(form);
      const url = formData.get("url") as string;
      mutate(url);
    } catch (error) {}
  };

  return (
    <div className="api-tester">
      <form onSubmit={handleVideo} className="endpoint-row">
        <input
          type="text"
          name="url"
          className="url-input"
          placeholder="Enter YouTube URL"
        />
        <button disabled={isPending} type="submit" className="send-button">
          {isPending ? "Downloading..." : "Download"}
        </button>
      </form>
    </div>
  );
}
