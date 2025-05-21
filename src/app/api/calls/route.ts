import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET handler for retrieving calls
export const GET = withAuth(async (request: NextRequest, user: any) => {
  try {
    const calls = await prisma.call.findMany({
      where: {
        userId: user.id
      },
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        profile: true
      }
    });

    return NextResponse.json({ calls });
  } catch (error) {
    console.error('Error fetching calls:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
});

// POST handler for creating a new call
export const POST = withAuth(async (request: NextRequest, user: any) => {
  try {
    const json = await request.json();
    
    const call = await prisma.call.create({
      data: {
        ...json,
        userId: user.id
      }
    });

    return NextResponse.json({ call });
  } catch (error) {
    console.error('Error creating call:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
});
