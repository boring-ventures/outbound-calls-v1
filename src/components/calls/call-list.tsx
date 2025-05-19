"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { useToast } from "@/components/ui/use-toast";
import { EyeIcon, PhoneIcon, RefreshCwIcon } from "lucide-react";
import { CallDetails } from "./call-details";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

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
}

interface CallsResponse {
  calls: Call[];
  pagination: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalCalls: number;
  };
}

async function fetchCalls(page = 1, pageSize = 10): Promise<CallsResponse> {
  const response = await fetch(`/api/calls?page=${page}&pageSize=${pageSize}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch calls");
  }

  return response.json();
}

export function CallList() {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [selectedCall, setSelectedCall] = useState<Call | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["calls", page, pageSize],
    queryFn: () => fetchCalls(page, pageSize),
  });

  const handleRefresh = () => {
    refetch();
    toast({
      title: "Refreshed",
      description: "Call list has been refreshed",
    });
  };

  const handleViewDetails = (call: Call) => {
    setSelectedCall(call);
  };

  const handleCloseDetails = () => {
    setSelectedCall(null);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  if (isLoading) {
    return <div className="flex justify-center py-8">Loading calls...</div>;
  }

  if (isError) {
    return (
      <div className="flex justify-center py-8 text-red-500">
        Error loading calls. Please try again.
      </div>
    );
  }

  const { calls, pagination } = data || {
    calls: [],
    pagination: { page: 1, pageSize: 10, totalPages: 1, totalCalls: 0 },
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
    <div className="space-y-4">
      <div className="flex justify-end mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          className="gap-1"
        >
          <RefreshCwIcon className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Phone Number</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Assistant</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {calls.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  No calls found. Create a new call to get started.
                </TableCell>
              </TableRow>
            ) : (
              calls.map((call) => (
                <TableRow key={call.id}>
                  <TableCell>
                    {format(new Date(call.createdAt), "MMM d, yyyy h:mm a")}
                  </TableCell>
                  <TableCell>{call.phoneNumber}</TableCell>
                  <TableCell>{getStatusBadge(call.status)}</TableCell>
                  <TableCell>{call.assistantId}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewDetails(call)}
                      className="gap-1"
                    >
                      <EyeIcon className="h-4 w-4" />
                      Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex justify-center mt-4">
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      )}

      {selectedCall && (
        <CallDetails call={selectedCall} onClose={handleCloseDetails} />
      )}
    </div>
  );
}
