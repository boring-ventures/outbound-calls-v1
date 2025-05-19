"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import { FileAudioIcon, PhoneIcon, RefreshCwIcon } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";

interface Call {
  id: string;
  vapiCallId: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
  phoneNumber: string;
  assistantId: string;
  recordingUrl?: string | null;
  transcript?: string | null;
  summary?: string | null;
  createdAt: string;
  updatedAt: string;
  metadata?: any;
}

interface CallDetailsProps {
  call: Call;
  onClose: () => void;
}

async function fetchCallDetails(id: string): Promise<Call> {
  const response = await fetch(`/api/calls/${id}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch call details");
  }

  return response.json();
}

export function CallDetails({ call: initialCall, onClose }: CallDetailsProps) {
  const [isOpen, setIsOpen] = useState(true);
  const { toast } = useToast();

  // Set up query to fetch the latest call details
  const { data: call, refetch } = useQuery({
    queryKey: ["call", initialCall.id],
    queryFn: () => fetchCallDetails(initialCall.id),
    initialData: initialCall,
  });

  const handleRefresh = () => {
    refetch();
    toast({
      title: "Refreshed",
      description: "Call details have been refreshed",
    });
  };

  const handleClose = () => {
    setIsOpen(false);
    onClose();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Badge variant="outline">Pending</Badge>;
      case "IN_PROGRESS":
        return <Badge variant="secondary">In Progress</Badge>;
      case "COMPLETED":
        return <Badge variant="success">Completed</Badge>;
      case "FAILED":
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PhoneIcon className="h-5 w-5" />
            Call Details
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4">
          <div>
            <h4 className="text-sm font-medium text-muted-foreground">
              Phone Number
            </h4>
            <p className="font-medium">{call.phoneNumber}</p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-muted-foreground">
              Status
            </h4>
            <div>{getStatusBadge(call.status)}</div>
          </div>
          <div>
            <h4 className="text-sm font-medium text-muted-foreground">
              Created
            </h4>
            <p className="font-medium">
              {format(new Date(call.createdAt), "MMM d, yyyy h:mm a")}
            </p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-muted-foreground">
              VAPI Call ID
            </h4>
            <p className="font-medium break-all">{call.vapiCallId}</p>
          </div>
        </div>

        <Tabs defaultValue="transcript">
          <TabsList className="grid grid-cols-3">
            <TabsTrigger value="transcript">Transcript</TabsTrigger>
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="recording">Recording</TabsTrigger>
          </TabsList>

          <TabsContent
            value="transcript"
            className="h-[300px] overflow-y-auto border rounded-md p-4"
          >
            {call.transcript ? (
              <div className="whitespace-pre-wrap">{call.transcript}</div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <p>No transcript available yet.</p>
                {call.status !== "COMPLETED" && call.status !== "FAILED" && (
                  <p className="text-sm mt-1">
                    The transcript will be available when the call is completed.
                  </p>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent
            value="summary"
            className="h-[300px] overflow-y-auto border rounded-md p-4"
          >
            {call.summary ? (
              <div className="whitespace-pre-wrap">{call.summary}</div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <p>No summary available yet.</p>
                {call.status !== "COMPLETED" && call.status !== "FAILED" && (
                  <p className="text-sm mt-1">
                    The summary will be available when the call is completed.
                  </p>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent
            value="recording"
            className="h-[300px] overflow-y-auto border rounded-md p-4"
          >
            {call.recordingUrl ? (
              <div className="flex flex-col items-center justify-center h-full">
                <audio controls className="w-full mb-4">
                  <source src={call.recordingUrl} type="audio/mpeg" />
                  Your browser does not support the audio element.
                </audio>
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={call.recordingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="gap-1"
                  >
                    <FileAudioIcon className="h-4 w-4" />
                    Open Recording in New Tab
                  </a>
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <p>No recording available yet.</p>
                {call.status !== "COMPLETED" && call.status !== "FAILED" && (
                  <p className="text-sm mt-1">
                    The recording will be available when the call is completed.
                  </p>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleRefresh} className="gap-1">
            <RefreshCwIcon className="h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={handleClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
