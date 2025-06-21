import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, type FormEvent } from "react";
import { cookiesQueryOptions } from "./query-options";

const Cookies = () => {
  const cookiesInputRef = useRef<HTMLInputElement>(null);

  const { data: cookiesContent, isLoading } = useQuery(cookiesQueryOptions());
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationKey: ["update-cookies"],
    mutationFn: async (form: FormData) => {
      const res = await fetch("/api/cookies", {
        method: "PUT",
        body: form,
      });
      if (!res.ok) {
        const errorData = (await res.json()) as { message: string };
        throw new Error(errorData.message);
      }
      return res.json() as Promise<{ message: string }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(cookiesQueryOptions());
      cookiesInputRef.current!.value = "";
      alert("Cookies file updated successfully");
    },
    onError: (error) => {
      alert(error.message);
    },
  });

  const handleFormSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isPending) return;

    const formData = new FormData(e.currentTarget);

    const file = formData.get("cookies");
    if (!file || !(file instanceof File)) return;

    if (!file.name.endsWith(".txt")) {
      alert("Please upload a .txt file");
      return;
    }
    mutate(formData);
  };

  return (
    <div className="cookies-container">
      <div className="cookies-header">
        <h2 className="cookies-title">🍪 Cookies Manager</h2>
        <p className="cookies-description">
          Upload your cookies.txt file to access private or age-restricted
          videos
        </p>
      </div>

      <div className="cookies-upload">
        <form onSubmit={handleFormSubmit} className="cookies-form">
          <div className="file-upload-section">
            <label htmlFor="cookies-file" className="file-upload-label">
              <div className="file-upload-area">
                <div className="upload-icon">📁</div>
                <span>Choose cookies.txt file</span>


                <input
                  ref={cookiesInputRef}
                  id="cookies-file"
                  name="cookies"
                  type="file"
                  accept=".txt"
                />
              </div>
            </label>
          </div>

          <div className="cookies-content-section">
            <label htmlFor="cookies-textarea" className="content-label">
              Current Cookies Content:
            </label>
            <textarea
              disabled
              id="cookies-textarea"
              value={
                isLoading
                  ? "Loading cookies..."
                  : cookiesContent?.data || "No cookies found"
              }
              className="cookies-textarea"
              placeholder="Paste your cookies content here..."
              rows={10}
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="cookies-submit-btn"
          >
            {isPending ? (
              <>
                <span className="loading-spinner"></span>
                Updating...
              </>
            ) : (
              "Update Cookies"
            )}
          </button>
        </form>
      </div>

      <div className="cookies-info">
        <h3>💡 How to get cookies.txt:</h3>
        <ol className="cookies-instructions">
          <li>Install a browser extension like "Get cookies.txt LOCALLY"</li>
          <li>Go to youtube.com and make sure you're logged in</li>
          <li>Click the extension icon and download cookies.txt</li>
          <li>Upload the file here to access private videos</li>
        </ol>
      </div>
    </div>
  );
};

export default Cookies;
