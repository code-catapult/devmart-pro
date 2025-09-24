import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function SampleComponent() {
  return (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Development Environment</CardTitle>
        <CardDescription>Your setup is working correctly!</CardDescription>
      </CardHeader>
      <CardContent>
        <Button className="w-full bg-amber-200 rounded-2xl">
          Continue to Next Story
        </Button>
      </CardContent>
    </Card>
  );
}
