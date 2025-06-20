import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./index.css";

import logo from "./logo.svg";
import reactLogo from "./react.svg";
import Videos from "./Videos";
import VideoInput from "./VideoInput";
import { useSSE } from "./useSSE";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60,
      staleTime: 1000 * 60 * 60,
    },
    mutations: {
      onError: (error) => {
        alert(error.message);
      },
    },
  },
});

export function App() {
  useSSE(queryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="app">
        <div className="logo-container">
          <img src={logo} alt="Bun Logo" className="logo bun-logo" />
          <img src={reactLogo} alt="React Logo" className="logo react-logo" />
        </div>

        <h1>Youtube Downloader</h1>
        <p>Paste Youtube link to download video</p>
        <VideoInput />
        <Videos />
      </div>
    </QueryClientProvider>
  );
}

export default App;
