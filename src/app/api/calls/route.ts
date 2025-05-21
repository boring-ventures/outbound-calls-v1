import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET handler for retrieving calls
export const GET = withAuth(async (request: NextRequest, user: any) => {
  try {
    console.log('Fetching calls for user:', user.id);
    
    // First, get the user's profile
    const userProfile = await prisma.profile.findUnique({
      where: { userId: user.id },
      select: { id: true }
    });

    if (!userProfile) {
      console.error('Profile not found for user:', user.id);
      return NextResponse.json(
        { error: 'Profile not found', message: 'User profile does not exist' },
        { status: 404 }
      );
    }

    // Then fetch calls using profileId
    const calls = await prisma.call.findMany({
      where: {
        profileId: userProfile.id
      },
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        profile: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true
          }
        }
      }
    });

    console.log(`Found ${calls.length} calls for profile:`, userProfile.id);
    return NextResponse.json({ calls });
  } catch (error) {
    console.error('Error fetching calls:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to fetch calls' },
      { status: 500 }
    );
  }
});

// POST handler for creating a new call
export const POST = withAuth(async (request: NextRequest, user: any) => {
  try {
    console.log('Creating new call for user:', user.id);
    
    // First, get the user's profile
    const userProfile = await prisma.profile.findUnique({
      where: { userId: user.id },
      select: { id: true }
    });

    if (!userProfile) {
      console.error('Profile not found for user:', user.id);
      return NextResponse.json(
        { error: 'Profile not found', message: 'User profile does not exist' },
        { status: 404 }
      );
    }

    const json = await request.json();
    
    const call = await prisma.call.create({
      data: {
        ...json,
        profileId: userProfile.id // Use profileId instead of userId
      },
      include: {
        profile: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true
          }
        }
      }
    });

    console.log('Call created successfully:', call.id);
    return NextResponse.json({ call });
  } catch (error) {
    console.error('Error creating call:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to create call' },
      { status: 500 }
    );
  }
});
