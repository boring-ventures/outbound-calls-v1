import { NextRequest, NextResponse } from "next/server";
import { getVapiClient, executeVapiCall } from "@/lib/vapiClient";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth-server";

// GET handler for retrieving a specific call
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate the request
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id } = params;

    // Get the profile for the authenticated user
    const profile = await db.profile.findUnique({
      where: {
        userId: session.user.id,
      },
    });

    if (!profile) {
      return new NextResponse("Profile not found", { status: 404 });
    }

    // Get the call from the database
    const call = await db.call.findUnique({
      where: {
        id,
        profileId: profile.id,
      },
    });

    if (!call) {
      return new NextResponse("Call not found", { status: 404 });
    }

    // Get the latest data from VAPI
    const vapiClient = getVapiClient();
    const { data: vapiCallData, error: vapiError } = await executeVapiCall(
      () => vapiClient.calls.get({ id: call.vapiCallId }),
      "Failed to fetch VAPI call details"
    );

    if (vapiError) {
      console.error(vapiError);
      // Continue with the database data even if VAPI call fails
    }

    // Update the call status and data if we got new information
    if (vapiCallData) {
      const updatedStatus = mapVapiStatusToCallStatus(vapiCallData.status);

      // Update the call in the database with latest data from VAPI
      await db.call.update({
        where: { id: call.id },
        data: {
          status: updatedStatus,
          recordingUrl: vapiCallData.recording_url || call.recordingUrl,
          transcript: vapiCallData.transcript || call.transcript,
          // Add other fields as needed from the VAPI response
          metadata: vapiCallData as any,
        },
      });

      // Refresh the call data after the update
      const updatedCall = await db.call.findUnique({
        where: { id: call.id },
      });

      if (updatedCall) {
        return NextResponse.json(updatedCall);
      }
    }

    // Return the original call if update failed or wasn't needed
    return NextResponse.json(call);
  } catch (error) {
    console.error("Error fetching call details:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

// Helper function to map VAPI status to our database status
function mapVapiStatusToCallStatus(
  vapiStatus: string
): "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED" {
  switch (vapiStatus) {
    case "queued":
    case "scheduled":
      return "PENDING";
    case "in-progress":
      return "IN_PROGRESS";
    case "completed":
      return "COMPLETED";
    case "failed":
      return "FAILED";
    default:
      return "PENDING";
  }
}
