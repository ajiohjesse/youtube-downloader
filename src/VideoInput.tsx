import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";
import { type Video } from "./types";
import { videoQueryOptions } from "./query-options";

export default function VideoInput() {
  const [url, setUrl] = useState("");
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationKey: ["video-request"],
    mutationFn: async ({
      url,
      highQuality,
    }: {
      url: string;
      highQuality: boolean;
    }) => {
      const res = await fetch(`/api/video`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url, highQuality }),
      });
      if (!res.ok) {
        const errorData = (await res.json()) as { message: string };
        throw new Error(errorData.message);
      }
      return res.json() as Promise<Omit<Video, "progress">>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(videoQueryOptions());
      setUrl(""); // Clear input after successful submission
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
      const quality = formData.get("quality") as string;

      if (!url.trim()) {
        alert("Please enter a YouTube URL");
        return;
      }

      mutate({ url: url.trim(), highQuality: quality === "best" });
    } catch (error) {
      console.error("Error submitting form:", error);
    }
  };

  const isValidYouTubeUrl = (url: string) => {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
    return youtubeRegex.test(url);
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value);
  };

  return (
    <div className="video-input-container">
      <div className="input-header">
        <h2 className="input-title">🎬 Download Video</h2>
        <p className="input-description">
          Paste any YouTube URL below and choose your preferred quality
        </p>
      </div>

      <form onSubmit={handleVideo} className="video-input-form">
        <div className="quality-selector">
          <label className="quality-label">Quality:</label>
          <div className="quality-options">
            <label className="quality-option">
              <input
                type="radio"
                name="quality"
                value="normal"
                defaultChecked
                className="quality-radio"
              />
              <span className="quality-text">
                <span className="quality-icon">🎯</span>
                Normal (Fast)
              </span>
            </label>
            <label className="quality-option">
              <input
                type="radio"
                name="quality"
                value="best"
                className="quality-radio"
              />
              <span className="quality-text">
                <span className="quality-icon">💎</span>
                Best (Slower)
              </span>
            </label>
          </div>
        </div>

        <div className="url-input-group">
          <div className="url-input-container">
            <div className="url-input-icon">🔗</div>
            <input
              type="text"
              name="url"
              value={url}
              onChange={handleUrlChange}
              className={`url-input ${url && !isValidYouTubeUrl(url) ? "invalid" : ""}`}
              placeholder="https://www.youtube.com/watch?v=..."
              disabled={isPending}
            />
            {url && !isValidYouTubeUrl(url) && (
              <div className="url-error">
                ⚠️ Please enter a valid YouTube URL
              </div>
            )}
          </div>

          <button
            disabled={isPending || !url.trim() || !isValidYouTubeUrl(url)}
            type="submit"
            className="download-button"
          >
            {isPending ? (
              <>
                <span className="loading-spinner"></span>
                <span>Processing...</span>
              </>
            ) : (
              <>
                <span className="download-icon">⬇️</span>
                <span>Download</span>
              </>
            )}
          </button>
        </div>
      </form>

      <div className="input-tips">
        <h4 className="tips-title">💡 Tips:</h4>
        <ul className="tips-list">
          <li>Supports YouTube videos, playlists, and shorts</li>
          <li>Choose "Best" quality for highest resolution (takes longer)</li>
          <li>Private videos require cookies.txt file</li>
        </ul>
      </div>
    </div>
  );
}
