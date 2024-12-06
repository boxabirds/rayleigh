import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Sparkles } from "lucide-react";

export default function HelloWorld() {
  const [clicks, setClicks] = useState(0);
  const { toast } = useToast();

  const handleClick = () => {
    setClicks(prev => prev + 1);
    toast({
      title: "Hello!",
      description: `You've clicked ${clicks + 1} times!`,
      duration: 2000,
    });
  };

  return (
    <div className="py-6 space-y-6">
      {/* Welcome card */}
      <Card className="bsky-card">
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold">Welcome to Rayleigh</h2>
              <p className="text-sm text-muted-foreground">A modern React application</p>
            </div>
          </div>
          
          <p className="text-muted-foreground">
            Built with Shadcn UI and styled like Bluesky. Click the button below to see it in action!
          </p>

          <div className="flex items-center space-x-3">
            <Button 
              onClick={handleClick}
              className="bsky-button"
            >
              Click me!
            </Button>
            <span className="text-sm text-muted-foreground">
              Clicked {clicks} times
            </span>
          </div>
        </div>
      </Card>

      {/* Feature cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bsky-card">
          <h3 className="font-semibold mb-2">Modern Stack</h3>
          <p className="text-sm text-muted-foreground">
            Using React, TypeScript, and Tailwind CSS for a modern development experience.
          </p>
        </Card>
        
        <Card className="bsky-card">
          <h3 className="font-semibold mb-2">Beautiful UI</h3>
          <p className="text-sm text-muted-foreground">
            Styled with Bluesky's design system for a clean and professional look.
          </p>
        </Card>
      </div>
    </div>
  );
}
