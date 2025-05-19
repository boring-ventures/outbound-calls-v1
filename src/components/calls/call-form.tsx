"use client";

import { useState } from "react";
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
import { useToast } from "@/components/ui/use-toast";
import { useMutation } from "@tanstack/react-query";

// Form schema with validation
const formSchema = z.object({
  phoneNumber: z
    .string()
    .min(10, "Phone number must be at least 10 digits")
    .refine((val) => /^\+?[1-9]\d{9,14}$/.test(val), {
      message:
        "Please enter a valid phone number (E.164 format recommended: +1XXXXXXXXXX)",
    }),
  assistantId: z.string().min(1, "Assistant ID is required"),
});

type FormValues = z.infer<typeof formSchema>;

// Function to create a new call
async function createCall(data: FormValues) {
  const response = await fetch("/api/calls", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.message || "Failed to create call");
  }

  return response.json();
}

export function CallForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  // Initialize form with validation
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      phoneNumber: "",
      assistantId: "",
    },
  });

  // Use React Query for API mutation
  const mutation = useMutation({
    mutationFn: createCall,
    onSuccess: (data) => {
      toast({
        title: "Call Created",
        description: `Your call to ${data.phoneNumber} has been created successfully.`,
      });
      form.reset();
      router.refresh();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description:
          error.message || "Failed to create call. Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  // Handle form submission
  const onSubmit = (data: FormValues) => {
    setIsSubmitting(true);
    mutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="phoneNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone Number</FormLabel>
              <FormControl>
                <Input placeholder="+15551234567" {...field} />
              </FormControl>
              <FormDescription>
                Enter the phone number in E.164 format (+1XXXXXXXXXX)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="assistantId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Assistant ID</FormLabel>
              <FormControl>
                <Input placeholder="asst_123456789" {...field} />
              </FormControl>
              <FormDescription>Enter your VAPI assistant ID</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? "Creating Call..." : "Create Call"}
        </Button>
      </form>
    </Form>
  );
}
