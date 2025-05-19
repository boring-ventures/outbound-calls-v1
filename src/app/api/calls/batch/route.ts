import { NextRequest, NextResponse } from "next/server";
import {
  getVapiClient,
  executeVapiCall,
  VapiCallResponse,
} from "@/lib/vapiClient";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth-server";

// POST handler for batch uploading calls
export async function POST(req: NextRequest) {
  try {
    // Authenticate the request
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Get the profile for the authenticated user
    const profile = await db.profile.findUnique({
      where: {
        userId: session.user.id,
      },
    });

    if (!profile) {
      return new NextResponse("Profile not found", { status: 404 });
    }

    // Parse request body
    const body = await req.json();
    const { assistantId, phoneNumbers, filename } = body;

    if (
      !assistantId ||
      !phoneNumbers ||
      !Array.isArray(phoneNumbers) ||
      phoneNumbers.length === 0
    ) {
      return new NextResponse("Invalid request data", { status: 400 });
    }

    // Create a batch upload record
    const batchUpload = await db.batchUpload.create({
      data: {
        filename: filename || "batch-upload.xlsx",
        totalCalls: phoneNumbers.length,
        successfulCalls: 0,
        failedCalls: 0,
        status: "PENDING",
        assistantId,
        profileId: profile.id,
      },
    });

    // Create call items for each phone number
    const callItems = await Promise.all(
      phoneNumbers.map((phoneNumber) =>
        db.callItem.create({
          data: {
            phoneNumber,
            status: "PENDING",
            batchUploadId: batchUpload.id,
          },
        })
      )
    );

    // Update the batch upload status to processing
    await db.batchUpload.update({
      where: {
        id: batchUpload.id,
      },
      data: {
        status: "PROCESSING",
      },
    });

    // Start processing calls in the background by scheduling them
    // In a production environment, this would be handled by a background job
    processCallBatch(batchUpload.id, assistantId).catch(console.error);

    return NextResponse.json({
      batchUploadId: batchUpload.id,
      totalCalls: phoneNumbers.length,
      status: "PROCESSING",
    });
  } catch (error) {
    console.error("Error creating batch upload:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

// GET handler for retrieving batch uploads
export async function GET(req: NextRequest) {
  try {
    // Authenticate the request
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Get the profile for the authenticated user
    const profile = await db.profile.findUnique({
      where: {
        userId: session.user.id,
      },
    });

    if (!profile) {
      return new NextResponse("Profile not found", { status: 404 });
    }

    // Parse query parameters
    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);
    const skip = (page - 1) * pageSize;

    // Get batch uploads from the database
    const batchUploads = await db.batchUpload.findMany({
      where: {
        profileId: profile.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: pageSize,
      skip,
    });

    // Get total count for pagination
    const totalBatchUploads = await db.batchUpload.count({
      where: {
        profileId: profile.id,
      },
    });

    return NextResponse.json({
      batchUploads,
      pagination: {
        page,
        pageSize,
        totalPages: Math.ceil(totalBatchUploads / pageSize),
        totalBatchUploads,
      },
    });
  } catch (error) {
    console.error("Error fetching batch uploads:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

// Helper function to process call batch in the background
async function processCallBatch(batchUploadId: string, assistantId: string) {
  try {
    // Get the batch upload and related call items
    const batchUpload = await db.batchUpload.findUnique({
      where: {
        id: batchUploadId,
      },
      include: {
        callItems: true,
      },
    });

    if (!batchUpload) {
      console.error(`Batch upload ${batchUploadId} not found`);
      return;
    }

    // Function to process each call item
    const processCallItem = async (callItem: any) => {
      try {
        // Create a call using the VAPI SDK
        const vapiClient = getVapiClient();
        const { data: vapiCallData, error: vapiError } =
          await executeVapiCall<VapiCallResponse>(
            () =>
              vapiClient.calls.create({
                phoneNumber: callItem.phoneNumber,
                assistantId: assistantId,
              }) as Promise<VapiCallResponse>,
            "Failed to create VAPI call"
          );

        if (vapiError || !vapiCallData) {
          // Update call item as failed
          await db.callItem.update({
            where: {
              id: callItem.id,
            },
            data: {
              status: "FAILED",
              errorMessage: vapiError || "Failed to create call",
            },
          });

          // Update batch upload statistics
          await db.batchUpload.update({
            where: {
              id: batchUploadId,
            },
            data: {
              failedCalls: {
                increment: 1,
              },
            },
          });

          return;
        }

        // Create a call record in the database
        const call = await db.call.create({
          data: {
            vapiCallId: vapiCallData.callId || vapiCallData.id || "unknown-id",
            status: "PENDING",
            phoneNumber: callItem.phoneNumber,
            assistantId,
            profileId: batchUpload.profileId,
          },
        });

        // Update the call item with the call ID and status
        await db.callItem.update({
          where: {
            id: callItem.id,
          },
          data: {
            callId: call.id,
            status: "SCHEDULED",
          },
        });

        // Update batch upload statistics
        await db.batchUpload.update({
          where: {
            id: batchUploadId,
          },
          data: {
            successfulCalls: {
              increment: 1,
            },
          },
        });
      } catch (error) {
        console.error(`Error processing call item ${callItem.id}:`, error);

        // Update call item as failed
        await db.callItem.update({
          where: {
            id: callItem.id,
          },
          data: {
            status: "FAILED",
            errorMessage:
              error instanceof Error ? error.message : String(error),
          },
        });

        // Update batch upload statistics
        await db.batchUpload.update({
          where: {
            id: batchUploadId,
          },
          data: {
            failedCalls: {
              increment: 1,
            },
          },
        });
      }
    };

    // Process each call item with a delay between calls to avoid rate limiting
    // In a production environment, this would be handled by a task queue
    for (const callItem of batchUpload.callItems) {
      await processCallItem(callItem);
      // Add a small delay between API calls to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // Check if all calls have been processed
    const updatedBatchUpload = await db.batchUpload.findUnique({
      where: {
        id: batchUploadId,
      },
    });

    if (updatedBatchUpload) {
      const allProcessed =
        updatedBatchUpload.successfulCalls + updatedBatchUpload.failedCalls ===
        updatedBatchUpload.totalCalls;

      if (allProcessed) {
        // Update batch upload status to completed
        await db.batchUpload.update({
          where: {
            id: batchUploadId,
          },
          data: {
            status: "COMPLETED",
          },
        });
      }
    }
  } catch (error) {
    console.error(`Error processing batch upload ${batchUploadId}:`, error);

    // Update batch upload status to failed
    await db.batchUpload.update({
      where: {
        id: batchUploadId,
      },
      data: {
        status: "FAILED",
      },
    });
  }
}
