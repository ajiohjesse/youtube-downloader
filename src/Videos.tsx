import { useQuery } from "@tanstack/react-query";
import { videoQueryOptions } from "./query-options";
import VideoCard from "./VideoCard";
import { useSSE } from "./useSSE";

const Videos = () => {
  const { data, error } = useQuery(videoQueryOptions());
  useSSE();

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  if (data) {
    return (
      <section>
        <h2>Videos</h2>

        <div>
          {data.data
            .sort(
              (a, b) =>
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime()
            )
            .map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
        </div>
      </section>
    );
  }

  return <div>Loading videos...</div>;
};

export default Videos;
