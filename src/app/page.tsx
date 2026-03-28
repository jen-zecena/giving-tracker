import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <h1 className="text-4xl font-bold">Giving Tracker</h1>
      <p className="text-lg text-muted-foreground">
        Component smoke test — verify shadcn/ui is working.
      </p>

      <Separator className="max-w-md" />

      {/* Buttons */}
      <div className="flex flex-wrap items-center gap-3">
        <Button>Default</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="destructive">Destructive</Button>
        <Button variant="link">Link</Button>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap items-center gap-3">
        <Badge>Default</Badge>
        <Badge variant="secondary">Secondary</Badge>
        <Badge variant="outline">Outline</Badge>
        <Badge variant="destructive">Destructive</Badge>
      </div>

      {/* Card with Input + Label */}
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Log a Donation</CardTitle>
          <CardDescription>Quick-add a new charitable gift.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="org">Organization</Label>
            <Input id="org" placeholder="e.g. Red Cross" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="amount">Amount</Label>
            <Input id="amount" type="number" placeholder="$0.00" />
          </div>
        </CardContent>
        <CardFooter>
          <Button className="w-full">Save Donation</Button>
        </CardFooter>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full max-w-md">
        <TabsList className="w-full">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="goals">Goals</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="rounded-lg border p-4 text-sm">
          Overview tab content renders here.
        </TabsContent>
        <TabsContent value="history" className="rounded-lg border p-4 text-sm">
          History tab content renders here.
        </TabsContent>
        <TabsContent value="goals" className="rounded-lg border p-4 text-sm">
          Goals tab content renders here.
        </TabsContent>
      </Tabs>
    </div>
  );
}
