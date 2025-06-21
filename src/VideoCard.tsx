import { useEffect, useState } from "react";
import { Video } from "./types";
import { progressSchema } from "./server/schemas";

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
      console.log({ progressEvent: data });
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
            <button className="btn btn-danger">Delete</button>
          </>
        )}
      </div>
    </div>
  );
};

export default VideoCard;
