import { useState, useEffect, useRef } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BskyAgent } from "@atproto/api";
import { Search } from "lucide-react";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Auto-focus the search input on mount
    inputRef.current?.focus();
  }, []);

  const handleSearch = async () => {
    if (!query.trim() || isLoading) return;

    setIsLoading(true);
    try {
      const agent = new BskyAgent({
        service: "https://bsky.social",
      });

      // Get session from localStorage if it exists
      const session = localStorage.getItem("bsky-session");
      if (session) {
        await agent.resumeSession(JSON.parse(session));
      }

      const searchResults = await agent.app.bsky.feed.searchPosts({
        q: query,
        limit: 20,
      });

      setResults(searchResults.data.posts);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Bluesky-style header */}
      <header className="fixed top-0 left-0 right-0 h-14 border-b border-border bg-background/80 backdrop-blur-sm z-50">
        <div className="max-w-feed mx-auto h-full px-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-primary">Rayleigh</h1>
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            <a href="/auth" className="text-muted-foreground hover:text-foreground transition-colors">
              Login
            </a>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="pt-14">
        <div className="max-w-feed mx-auto px-4 py-8">
          {/* Search section */}
          <div className="bsky-card mb-8">
            <h2 className="text-2xl font-semibold mb-6">Search Bluesky</h2>
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  ref={inputRef}
                  type="text"
                  placeholder="Search for posts..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="bsky-input pl-9"
                />
              </div>
              <Button
                onClick={handleSearch}
                disabled={isLoading}
                className="bsky-button"
              >
                {isLoading ? "Searching..." : "Search"}
              </Button>
            </div>
          </div>

          {/* Results section */}
          <div className="space-y-4">
            {results.map((post) => (
              <Card key={post.uri} className="bsky-card">
                <div className="flex items-start gap-4">
                  {post.author.avatar && (
                    <img
                      src={post.author.avatar}
                      alt={post.author.displayName || post.author.handle}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">
                        {post.author.displayName || post.author.handle}
                      </h3>
                      <span className="text-sm text-muted-foreground">
                        @{post.author.handle}
                      </span>
                    </div>
                    <p className="mt-2">{post.record.text}</p>
                    {post.embed?.images && (
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        {post.embed.images.map((image: any, index: number) => (
                          <img
                            key={index}
                            src={image.thumb}
                            alt={image.alt || "Post image"}
                            className="rounded-md w-full h-auto"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
} 