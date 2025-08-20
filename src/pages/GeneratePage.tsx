import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { PlayCircle } from "lucide-react";
import PageLayout from "@/components/PageLayout";

const GeneratePage = () => {
  return (
    <PageLayout 
      title="Generate" 
      description="Enter your instructions below to generate a new video."
    >
      <div className="grid md:grid-cols-2 gap-8">
        <div className="flex flex-col gap-4">
          <Textarea
            placeholder="e.g., A cinematic shot of a futuristic city at night, with flying cars and neon signs."
            className="min-h-[200px] text-base"
          />
          <Button size="lg">Generate</Button>
        </div>
        <div className="flex items-center justify-center">
          <Card className="w-full aspect-video flex items-center justify-center bg-muted">
            <CardContent className="flex flex-col items-center justify-center text-muted-foreground">
              <PlayCircle className="w-16 h-16 mb-4" />
              <p>Your generated video will appear here.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageLayout>
  );
};

export default GeneratePage;