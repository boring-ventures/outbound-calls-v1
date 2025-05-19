import { CallList } from "@/components/calls/call-list";
import { CallForm } from "@/components/calls/call-form";
import { Separator } from "@/components/ui/separator";
import { Suspense } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExcelUpload } from "@/components/calls/excel-upload";

export const metadata = {
  title: "Call Dashboard | VAPI Admin",
  description: "Manage your outbound calls with VAPI",
};

export default function DashboardPage() {
  return (
    <div className="flex h-full flex-1 flex-col space-y-8 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Call Dashboard</h2>
          <p className="text-muted-foreground">
            Manage and monitor your outbound calls
          </p>
        </div>
      </div>

      <Tabs defaultValue="calls">
        <TabsList>
          <TabsTrigger value="calls">Call History</TabsTrigger>
          <TabsTrigger value="new-call">New Call</TabsTrigger>
          <TabsTrigger value="bulk-upload">Bulk Upload</TabsTrigger>
        </TabsList>

        <TabsContent value="calls" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Calls</CardTitle>
              <CardDescription>
                View and manage your recent outbound calls
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<div>Loading calls...</div>}>
                <CallList />
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="new-call" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Create New Call</CardTitle>
              <CardDescription>
                Place a new outbound call via VAPI
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CallForm />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bulk-upload" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Bulk Upload</CardTitle>
              <CardDescription>
                Upload an Excel file with phone numbers for batch calling
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ExcelUpload />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
