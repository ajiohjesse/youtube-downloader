import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./index.css";
import logo from "./logo.svg";
import Videos from "./Videos";
import VideoInput from "./VideoInput";
import Cookies from "./Cookies";

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
  return (
    <QueryClientProvider client={queryClient}>
      <div className="app">
        <header className="app-header">
          <div className="logo-container">
            <img src={logo} alt="Bun Logo" className="logo bun-logo" />
          </div>
          <div className="header-content">
            <h1 className="app-title">YouTube Downloader</h1>
            <p className="app-subtitle">
              Download your favorite videos with ease
            </p>
          </div>
        </header>

        <main className="main-content">
          <section className="download-section">
            <VideoInput />
          </section>

          <div className="content-grid">
            <section className="videos-section">
              <Videos />
            </section>

            <section className="cookies-section">
              <Cookies />
            </section>
          </div>
        </main>
      </div>
    </QueryClientProvider>
  );
}

export default App;
