import { NextRequest, NextResponse } from "next/server";
import {
  getVapiClient,
  executeVapiCall,
  VapiCallResponse,
} from "@/lib/vapiClient";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth-server";

// GET handler for retrieving calls
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

    // Get calls from the database
    const calls = await db.call.findMany({
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
    const totalCalls = await db.call.count({
      where: {
        profileId: profile.id,
      },
    });

    return NextResponse.json({
      calls,
      pagination: {
        page,
        pageSize,
        totalPages: Math.ceil(totalCalls / pageSize),
        totalCalls,
      },
    });
  } catch (error) {
    console.error("Error fetching calls:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

// POST handler for creating a new call
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
    const { phoneNumber, assistantId } = body;

    if (!phoneNumber || !assistantId) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    // Create a call using the VAPI SDK
    const vapiClient = getVapiClient();
    const { data: vapiCallData, error: vapiError } =
      await executeVapiCall<VapiCallResponse>(
        () =>
          vapiClient.calls.create({
            phoneNumber: phoneNumber,
            assistantId: assistantId,
          }) as Promise<VapiCallResponse>,
        "Failed to create VAPI call"
      );

    if (vapiError || !vapiCallData) {
      return new NextResponse(vapiError || "Failed to create call", {
        status: 500,
      });
    }

    // Save the call to the database
    const call = await db.call.create({
      data: {
        vapiCallId: vapiCallData.callId || vapiCallData.id || "unknown-id",
        status: "PENDING",
        phoneNumber,
        assistantId,
        profileId: profile.id,
      },
    });

    return NextResponse.json(call);
  } catch (error) {
    console.error("Error creating call:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
