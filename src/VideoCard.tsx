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
    weekday: "short",
    month: "short",
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
  }, [video.id]);

  const getStatusBadge = () => {
    const statusConfig = {
      completed: { emoji: "✅", text: "Completed", class: "completed" },
      pending: { emoji: "⏳", text: "Pending", class: "pending" },
      error: { emoji: "❌", text: "Error", class: "error" },
    };

    const config = statusConfig[video.status as keyof typeof statusConfig];
    if (!config) return null;

    return (
      <div className={`status-badge ${config.class}`}>
        <span className="status-emoji">{config.emoji}</span>
        <span className="status-text">{config.text}</span>
      </div>
    );
  };

  const truncateUrl = (url: string, maxLength: number = 50) => {
    if (url.length <= maxLength) return url;
    return url.substring(0, maxLength) + "...";
  };

  return (
    <div className="video-card">
      <div className="video-card-header">
        <h3 className="video-title">{video.title}</h3>
        {getStatusBadge()}
      </div>

      <div className="video-url-container">
        <div className="url-icon">🔗</div>
        <a
          href={video.url}
          target="_blank"
          rel="noopener noreferrer"
          className="video-url-link"
          title={video.url}
        >
          {truncateUrl(video.url)}
        </a>
      </div>

      <div className="video-metadata">
        <div className="meta-item">
          <span className="meta-icon">📅</span>
          <span className="meta-text">
            Created: {formatDate(video.createdAt)}
          </span>
        </div>
        <div className="meta-item">
          <span className="meta-icon">🔄</span>
          <span className="meta-text">
            Updated: {formatDate(video.updatedAt)}
          </span>
        </div>
        {video.size && (
          <div className="meta-item">
            <span className="meta-icon">📊</span>
            <span className="meta-text">Size: {video.size}</span>
          </div>
        )}
      </div>

      {progress && (
        <div className="progress-container">
          <div className="progress-text">
            <span className="progress-icon">⚡</span>
            <span>{progress}</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill"></div>
          </div>
        </div>
      )}

      {video.status === "completed" && (
        <div className="video-actions">
          <a href={`/api/download/${video.id}`} className="btn btn-download">
            <span className="btn-icon">⬇️</span>
            Download Video
          </a>
          <DeleteVideoButton id={video.id} />
        </div>
      )}
    </div>
  );
};

const DeleteVideoButton = ({ id }: { id: number }) => {
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
    if (confirm("🗑️ Are you sure you want to delete this video?")) {
      mutate({ id });
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="btn btn-delete"
    >
      <span className="btn-icon">🗑️</span>
      {isPending ? "Deleting..." : "Delete"}
    </button>
  );
};

export default VideoCard;
