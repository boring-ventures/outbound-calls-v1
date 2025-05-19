import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-server";
import { db } from "@/lib/db";

// GET: Fetch profile for the current authenticated user
export async function GET() {
  try {
    // Get the current user's session using our auth-server implementation
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userId = session.user.id;

    // Fetch profile from the database
    const profile = await db.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      // If profile doesn't exist, create one automatically
      const newProfile = await db.profile.create({
        data: {
          userId,
          active: true,
          role: "USER",
        },
      });

      return NextResponse.json(newProfile);
    }

    return NextResponse.json(profile);
  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}

// PUT: Update profile for the current authenticated user
export async function PUT(request: NextRequest) {
  try {
    // Get the current user's session using our auth-server implementation
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userId = session.user.id;
    const data = await request.json();
    const { firstName, lastName, avatarUrl, active } = data;

    // Find existing profile
    const existingProfile = await db.profile.findUnique({
      where: { userId },
    });

    if (!existingProfile) {
      // Create profile if it doesn't exist
      const newProfile = await db.profile.create({
        data: {
          userId,
          firstName,
          lastName,
          avatarUrl,
          active: active !== undefined ? active : true,
          role: "USER",
        },
      });

      return NextResponse.json(newProfile);
    }

    // Update profile in the database
    const updatedProfile = await db.profile.update({
      where: { userId },
      data: {
        firstName,
        lastName,
        avatarUrl,
        active: active !== undefined ? active : existingProfile.active,
      },
    });

    return NextResponse.json(updatedProfile);
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}

// POST: Create a new profile for the current authenticated user
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { userId, firstName, lastName, avatarUrl } = data;

    // If userId is provided directly (during signup flow)
    if (userId) {
      // Check if profile already exists
      const existingProfile = await db.profile.findUnique({
        where: { userId },
      });

      if (existingProfile) {
        return NextResponse.json(
          { error: "Profile already exists" },
          { status: 409 }
        );
      }

      // Create profile in the database
      const newProfile = await db.profile.create({
        data: {
          userId,
          firstName,
          lastName,
          avatarUrl,
          active: true,
          role: "USER",
        },
      });

      return NextResponse.json(newProfile, { status: 201 });
    }

    // Normal flow requiring authentication
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const authenticatedUserId = session.user.id;

    // Check if profile already exists
    const existingProfile = await db.profile.findUnique({
      where: { userId: authenticatedUserId },
    });

    if (existingProfile) {
      return NextResponse.json(
        { error: "Profile already exists" },
        { status: 409 }
      );
    }

    // Create profile in the database
    const newProfile = await db.profile.create({
      data: {
        userId: authenticatedUserId,
        firstName,
        lastName,
        avatarUrl,
        active: true,
        role: "USER",
      },
    });

    return NextResponse.json(newProfile, { status: 201 });
  } catch (error) {
    console.error("Error creating profile:", error);
    return NextResponse.json(
      { error: "Failed to create profile" },
      { status: 500 }
    );
  }
}
