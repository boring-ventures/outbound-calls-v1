// Re-export everything from auth-server for compatibility
export * from "./auth-server";

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getRouteHandlerSupabase } from './supabase/server';

export async function authenticateRequest(request: NextRequest) {
  try {
    const supabase = await getRouteHandlerSupabase();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return { 
        error: new NextResponse('Unauthorized', { status: 401 }),
        user: null 
      };
    }

    return { error: null, user };
  } catch (error) {
    console.error('Authentication error:', error);
    return { 
      error: new NextResponse('Internal Server Error', { status: 500 }),
      user: null 
    };
  }
}

export async function withAuth(handler: Function) {
  return async (request: NextRequest, ...args: any[]) => {
    const { user, error } = await authenticateRequest(request);
    if (error) return error;
    return handler(request, user, ...args);
  };
}
