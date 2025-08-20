import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MadeWithDyad } from "@/components/made-with-dyad";

const Index = () => {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-grow flex items-center justify-center">
        <div className="text-center space-y-6">
          <h1 className="text-5xl font-bold tracking-tighter sm:text-6xl md:text-7xl">
            AICoder 2025 Codebase
          </h1>
          <p className="max-w-[600px] mx-auto text-muted-foreground md:text-xl">
            Modern AI-powered development codebase with React, TypeScript, and shadcn/ui components.
          </p>
          <div className="flex justify-center gap-4">
            <Button asChild size="lg">
              <Link to="/dashboard">Get Started</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;