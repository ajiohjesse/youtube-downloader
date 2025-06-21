import { useEffect, useState } from "react";
import { Video } from "./types";
import { progressSchema } from "./server/schemas";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { videoQueryOptions } from "./query-options";

type VideoCardProps = {
  video: Video;
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-NG", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  });
};

const VideoCard: React.FC<VideoCardProps> = ({ video }) => {
  const [progress, setProgress] = useState("");

  useEffect(() => {
    const eventSource = new EventSource(`/api/sse`);

    const handleProgressEvent = ({ data }: { data: any }) => {
      try {
        const jsonData = JSON.parse(data);
        const result = progressSchema.safeParse(jsonData);
        if (!result.success) {
          console.log("Invalid sse progress data: ", result.error);
          return;
        }
        const { videoId, progress } = result.data;
        if (videoId === video.id) setProgress(progress);
      } catch (error) {
        console.log("SSE error: ", error);
      }
    };

    eventSource.addEventListener("progress", handleProgressEvent);

    return () => {
      eventSource.removeEventListener("progress", handleProgressEvent);
      eventSource.close();
    };
  }, []);

  const getStatusBadge = () => {
    switch (video.status) {
      case "completed":
        return <span className="status-badge completed">Completed</span>;
      case "pending":
        return <span className="status-badge pending">Pending</span>;
      case "error":
        return <span className="status-badge error">Error</span>;
      default:
        return null;
    }
  };

  return (
    <div className="video-card">
      <h3 className="video-title">{video.title}</h3>

      <div>{getStatusBadge()}</div>

      <div className="video-url">
        <a
          href={video.url}
          target="_blank"
          rel="noopener noreferrer"
          className="url-link"
        >
          {video.url}
        </a>
      </div>

      <div className="video-meta">
        <span>Created: {formatDate(video.createdAt)}</span>
        <span>Updated: {formatDate(video.updatedAt)}</span>
      </div>

      {video.size ? (
        <div className="video-meta">
          <span>SIze: {video.size}</span>
        </div>
      ) : null}

      {progress !== "" && (
        <div className="video-meta">
          <span>{progress}</span>
        </div>
      )}

      <div className="video-actions">
        {video.status === "completed" && (
          <>
            <a href={`/api/download/${video.id}`} className="btn btn-primary">
              Download
            </a>
            <DeleteVideo id={video.id} />
          </>
        )}
      </div>
    </div>
  );
};

export default VideoCard;

const DeleteVideo = ({ id }: { id: number }) => {
  const queryClient = useQueryClient();

  const { isPending, mutate } = useMutation({
    mutationKey: ["delete-video"],
    mutationFn: async ({ id }: { id: number }) => {
      const res = await fetch(`/api/video/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (!res.ok) {
        const errorData = (await res.json()) as { message: string };
        throw new Error(errorData.message);
      }
      return res.json() as Promise<{ message: string }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(videoQueryOptions());
    },
    onError: (error) => {
      alert(error.message);
    },
  });

  const handleDelete = () => {
    if (isPending) return;
    if (confirm("Are you sure you want to delete this video?")) {
      mutate({ id });
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="btn btn-danger"
    >
      {isPending ? "Deleting..." : "Delete"}
    </button>
  );
};
