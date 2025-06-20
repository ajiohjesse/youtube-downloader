import { Video } from "./types";

type VideoCardProps = {
  video: Video;
};

const VideoCard: React.FC<VideoCardProps> = ({ video }) => {
  const onDownload = () => {};

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

      {video.progress !== "" && (
        <div className="video-meta">
          <span>{video.progress}</span>
        </div>
      )}

      <div className="video-actions">
        {video.status === "completed" && (
          <>
            <a
              href={`/api/download/${video.id}`}
              className="btn btn-primary"
              onClick={onDownload}
            >
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
