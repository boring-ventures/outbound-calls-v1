// Server-side authentication utility for Supabase Auth
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Define the session user type
export interface User {
  id: string;
  email?: string;
  name?: string;
  role?: string;
}

// Define the session type
export interface Session {
  user: User | null;
}

// Get the current session for server components
export async function getServerSession(): Promise<Session | null> {
  try {
    // Create the Supabase client using the cookieStore directly
    // This approach avoids the async cookies issue
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name) {
            // Return null if cookie not found, instead of trying to access it
            try {
              const cookies_obj = cookies();
              const cookie = cookies_obj.get(name);
              return cookie?.value;
            } catch (error) {
              console.error("Error getting cookie:", error);
              return null;
            }
          },
          set() {}, // Not needed for server components
          remove() {}, // Not needed for server components
        },
      }
    );

    // Get the session
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
    console.error("Server auth error:", error);
    return null;
  }
}

// Re-export the getServerSession as auth for compatibility
export const auth = getServerSession;
