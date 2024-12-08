import HelloWorld from "../components/HelloWorld";
import { ThemeToggle } from "@/components/theme-toggle";
import { ProfileMenu } from "@/components/ProfileMenu";
import { useIsAuthenticated } from '../contexts/agent';

export default function HomePage() {
  const isAuthenticated = useIsAuthenticated();

  return (
    <div className="min-h-screen bg-background">
      {/* Bluesky-style header */}
      <header className="fixed top-0 left-0 right-0 h-14 border-b border-border bg-background/80 backdrop-blur-sm z-50">
        <div className="max-w-feed mx-auto h-full px-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-primary">Rayleigh</h1>
          <div className="flex items-center space-x-4">
            <a href="/search" className="text-muted-foreground hover:text-foreground transition-colors">
              Search
            </a>
            <ThemeToggle />
            {isAuthenticated ? (
              <ProfileMenu />
            ) : (
              <a href="/auth" className="text-muted-foreground hover:text-foreground transition-colors">
                Login
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="pt-14">
        <div className="max-w-feed mx-auto px-4">
          <HelloWorld />
        </div>
      </main>
    </div>
  );
}
