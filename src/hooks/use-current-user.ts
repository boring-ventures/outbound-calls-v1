"use client";

import { useEffect, useState, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import type { Profile } from "@prisma/client";

type CurrentUserData = {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
};

export function useCurrentUser(): CurrentUserData {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Create the Supabase client
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const fetchUserData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get current user from Supabase
      const { data: userData, error: userError } =
        await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (userData?.user) {
        setUser(userData.user);

        // Fetch the user's profile from the API
        const profileResponse = await fetch("/api/profile", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          // Include credentials to send cookies
          credentials: "include",
        });

        if (!profileResponse.ok) {
          // If profile not found, try to create one
          if (profileResponse.status === 404) {
            const createResponse = await fetch("/api/profile", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                userId: userData.user.id,
                firstName: userData.user.user_metadata?.name || "",
                lastName: "",
                avatarUrl: userData.user.user_metadata?.avatar_url || "",
              }),
              credentials: "include",
            });

            if (createResponse.ok) {
              const newProfileData = await createResponse.json();
              setProfile(newProfileData);
              return;
            }
          }

          console.error("Profile fetch error:", await profileResponse.text());
          throw new Error("Failed to fetch profile");
        }

        const profileData = await profileResponse.json();
        setProfile(profileData);
      } else {
        // No user is signed in
        setUser(null);
        setProfile(null);
      }
    } catch (err) {
      console.error("Error fetching user data:", err);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchUserData();

    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
          if (session) {
            setUser(session.user);
            fetchUserData();
          }
        } else if (event === "SIGNED_OUT") {
          setUser(null);
          setProfile(null);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [supabase, fetchUserData]);

  return { user, profile, isLoading, error, refetch: fetchUserData };
}
