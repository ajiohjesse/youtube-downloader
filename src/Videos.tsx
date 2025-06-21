import { useQuery } from "@tanstack/react-query";
import { videoQueryOptions } from "./query-options";
import VideoCard from "./VideoCard";
import { useSSE } from "./useSSE";

const Videos = () => {
  const { data, error, isLoading } = useQuery(videoQueryOptions());
  useSSE();

  if (error) {
    return (
      <div className="videos-error">
        <div className="error-icon">❌</div>
        <h3>Oops! Something went wrong</h3>
        <p>Error: {error.message}</p>
        <button
          onClick={() => window.location.reload()}
          className="retry-button"
        >
          🔄 Try Again
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="videos-loading">
        <div className="loading-spinner large"></div>
        <h3>Loading your videos...</h3>
        <p>This might take a moment</p>
      </div>
    );
  }

  if (data) {
    const sortedVideos = data.data.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return (
      <div className="videos-container">
        <div className="videos-header">
          <h2 className="videos-title">
            📹 Your Videos
            <span className="videos-count">({sortedVideos.length})</span>
          </h2>
          {sortedVideos.length > 0 && (
            <p className="videos-description">Recent downloads appear first</p>
          )}
        </div>

        {sortedVideos.length === 0 ? (
          <div className="videos-empty">
            <div className="empty-icon">📭</div>
            <h3>No videos yet</h3>
            <p>
              Start by pasting a YouTube URL above to download your first video!
            </p>
          </div>
        ) : (
          <div className="videos-grid">
            {sortedVideos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="videos-loading">
      <div className="loading-spinner large"></div>
      <h3>Initializing...</h3>
    </div>
  );
};

export default Videos;
