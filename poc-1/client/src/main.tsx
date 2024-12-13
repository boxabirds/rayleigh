import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { AgentProvider } from "./contexts/agent";
import Router from "./routes/Router";
import { BskyAgent } from "@atproto/api";
import { AgentProvider as AgentProviderContext } from "./contexts/agent";

const agent = new BskyAgent({ service: "https://bsky.social" });

function App() {
  return (
    <Router />
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="ui-theme">
        <AgentProviderContext agent={agent}>
          <Toaster />
          <App />
        </AgentProviderContext>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
);
