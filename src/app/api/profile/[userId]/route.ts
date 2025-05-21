import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { getRouteHandlerSupabase } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    console.log('Profile API called for userId:', params.userId);
    
    const supabase = await getRouteHandlerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('No authenticated user found:', authError);
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }
    
    console.log('Session found for user:', user.id);
    
    // Only allow users to view their own profile (or admin users to view any profile)
    const userProfile = await prisma.profile.findUnique({
      where: { userId: user.id },
    });

    if (params.userId !== user.id && userProfile?.role !== 'SUPERADMIN') {
      console.error('Access forbidden: User trying to access another profile');
      return NextResponse.json(
        { error: 'Forbidden', message: 'Cannot access this profile' },
        { status: 403 }
      );
    }

    const profile = await prisma.profile.findUnique({
      where: { userId: params.userId },
    });

    if (!profile) {
      console.log('Profile not found, creating new profile');
      
      // If profile doesn't exist, create one with default values
      const newProfile = await prisma.profile.create({
        data: {
          userId: params.userId,
          firstName: user.user_metadata?.first_name || '',
          lastName: user.user_metadata?.last_name || '',
          role: 'USER',
          active: true,
        },
      });
      
      console.log('New profile created:', newProfile.id);
      return NextResponse.json(newProfile);
    }
    
    console.log('Profile found:', profile.id);
    return NextResponse.json(profile);
    
  } catch (error) {
    console.error('Error in profile API:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const supabase = await getRouteHandlerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Only allow users to update their own profile (or admin users to update any profile)
    const userProfile = await prisma.profile.findUnique({
      where: { userId: user.id },
    });

    if (params.userId !== user.id && userProfile?.role !== 'SUPERADMIN') {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const json = await request.json();

    const updatedProfile = await prisma.profile.update({
      where: { userId: params.userId },
      data: {
        firstName: json.firstName || undefined,
        lastName: json.lastName || undefined,
        avatarUrl: json.avatarUrl || undefined,
        active: json.active !== undefined ? json.active : undefined,
      },
    });

    return NextResponse.json({ profile: updatedProfile });
  } catch (error) {
    console.error('Error updating profile:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
