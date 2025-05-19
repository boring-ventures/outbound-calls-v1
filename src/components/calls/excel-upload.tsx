"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { useMutation } from "@tanstack/react-query";
import { DownloadIcon, FileSpreadsheetIcon, UploadIcon } from "lucide-react";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import * as XLSX from "xlsx";

// Form schema with validation
const formSchema = z.object({
  assistantId: z.string().min(1, "Assistant ID is required"),
  file: z
    .instanceof(File)
    .refine((file) => file.size > 0, "Please select a file")
    .refine((file) => {
      const ext = file.name.split(".").pop()?.toLowerCase();
      return ext === "xlsx" || ext === "xls" || ext === "csv";
    }, "File must be an Excel or CSV file"),
});

type FormValues = z.infer<typeof formSchema>;

// Function to process and upload Excel data
async function uploadExcelData(data: {
  assistantId: string;
  phoneNumbers: string[];
  filename: string;
}) {
  const response = await fetch("/api/calls/batch", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.message || "Failed to upload data");
  }

  return response.json();
}

export function ExcelUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [validNumbers, setValidNumbers] = useState<string[]>([]);
  const [invalidNumbers, setInvalidNumbers] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { toast } = useToast();

  // Initialize form with validation
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      assistantId: "",
    },
  });

  // Use React Query for API mutation
  const mutation = useMutation({
    mutationFn: uploadExcelData,
    onSuccess: (data) => {
      toast({
        title: "Upload Successful",
        description: `Batch upload started with ${validNumbers.length} phone numbers.`,
      });
      form.reset();
      setValidNumbers([]);
      setInvalidNumbers([]);
      setFileName("");
      setProgress(0);
      router.refresh();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description:
          error.message || "Failed to upload data. Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsUploading(false);
    },
  });

  // Process Excel/CSV file
  const processFile = (file: File) => {
    setIsUploading(true);
    setProgress(10);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        setProgress(30);
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        setProgress(50);

        // Get the first sheet
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json<
          Record<string, string | number>
        >(worksheet, { header: 1, raw: false });
        setProgress(70);

        // Extract and validate phone numbers
        const allNumbers = jsonData
          .flat()
          .filter(Boolean)
          .map((entry) => String(entry).trim());

        const validPhones: string[] = [];
        const invalidPhones: string[] = [];

        allNumbers.forEach((phone) => {
          // E.164 phone number validation (basic)
          if (/^\+?[1-9]\d{9,14}$/.test(phone)) {
            validPhones.push(phone);
          } else {
            invalidPhones.push(phone);
          }
        });

        setValidNumbers(validPhones);
        setInvalidNumbers(invalidPhones);
        setProgress(100);
      } catch (error) {
        toast({
          title: "Error Processing File",
          description:
            "Failed to process the Excel file. Please check the format.",
          variant: "destructive",
        });
        setIsUploading(false);
      }
    };

    reader.onerror = () => {
      toast({
        title: "Error Reading File",
        description: "Failed to read the file. Please try again.",
        variant: "destructive",
      });
      setIsUploading(false);
    };

    reader.readAsArrayBuffer(file);
  };

  // Handle file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      form.setValue("file", file);
      processFile(file);
    }
  };

  // Handle form submission
  const onSubmit = (data: FormValues) => {
    if (validNumbers.length === 0) {
      toast({
        title: "No Valid Numbers",
        description:
          "No valid phone numbers found in the file. Please check and try again.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    mutation.mutate({
      assistantId: data.assistantId,
      phoneNumbers: validNumbers,
      filename: fileName,
    });
  };

  const downloadSampleTemplate = () => {
    // Create a simple sample Excel file
    const ws = XLSX.utils.aoa_to_sheet([
      ["Phone Numbers"],
      ["+15551234567"],
      ["+442071234567"],
      ["+61291234567"],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Phone Numbers");
    XLSX.writeFile(wb, "sample_phone_numbers.xlsx");
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="assistantId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Assistant ID</FormLabel>
              <FormControl>
                <Input placeholder="asst_123456789" {...field} />
              </FormControl>
              <FormDescription>
                Enter your VAPI assistant ID to be used for all calls
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="file"
          render={({ field: { value, onChange, ...fieldProps } }) => (
            <FormItem>
              <FormLabel>Upload Excel/CSV File</FormLabel>
              <FormControl>
                <div className="flex flex-col space-y-2">
                  <div className="flex items-center space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="gap-1"
                      disabled={isUploading}
                    >
                      <UploadIcon className="h-4 w-4" />
                      {fileName ? "Change File" : "Select File"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={downloadSampleTemplate}
                      className="gap-1"
                    >
                      <DownloadIcon className="h-4 w-4" />
                      Download Template
                    </Button>
                  </div>
                  {fileName && (
                    <div className="flex items-center space-x-2 text-sm">
                      <FileSpreadsheetIcon className="h-4 w-4" />
                      <span>{fileName}</span>
                    </div>
                  )}
                  <Input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    {...fieldProps}
                  />
                </div>
              </FormControl>
              <FormDescription>
                Upload an Excel or CSV file containing phone numbers (one per
                line or column)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {isUploading && <Progress value={progress} className="w-full" />}

        {validNumbers.length > 0 && (
          <div className="text-sm">
            <p className="font-medium">File processed:</p>
            <p className="text-green-600">
              {validNumbers.length} valid phone number(s) found
            </p>
            {invalidNumbers.length > 0 && (
              <p className="text-red-500">
                {invalidNumbers.length} invalid phone number(s) skipped
              </p>
            )}
          </div>
        )}

        {invalidNumbers.length > 0 && (
          <Alert variant="warning">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Warning</AlertTitle>
            <AlertDescription>
              Some phone numbers in your file are invalid and will be skipped.
              Valid phone numbers should be in E.164 format (e.g.,
              +15551234567).
            </AlertDescription>
          </Alert>
        )}

        <Button
          type="submit"
          disabled={isUploading || validNumbers.length === 0}
          className="w-full"
        >
          {isUploading ? "Processing..." : "Start Batch Upload"}
        </Button>
      </form>
    </Form>
  );
}
