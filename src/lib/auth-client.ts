"use client";

import { createBrowserClient } from "@supabase/ssr";

export interface User {
  id: string;
  email?: string;
  name?: string;
  role?: string;
}

export interface Session {
  user: User | null;
}

// Create a client-side Supabase client
export const createClient = () => {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
};

// Get the current session from the client-side
export async function getClientSession(): Promise<Session | null> {
  try {
    const supabase = createClient();
    const { data } = await supabase.auth.getSession();

    if (!data.session) return null;

    return {
      user: {
        id: data.session.user.id,
        email: data.session.user.email,
        name: data.session.user.user_metadata?.name,
        role: data.session.user.user_metadata?.role || "USER",
      },
    };
  } catch (error) {
    console.error("Client auth error:", error);
    return null;
  }
}

// Function to get the current user (useful for client components)
export async function getCurrentUser(): Promise<User | null> {
  const session = await getClientSession();
  return session?.user || null;
}
