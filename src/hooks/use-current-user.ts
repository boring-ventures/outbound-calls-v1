"use client";

import { useEffect } from "react";
import type { User, AuthChangeEvent } from "@supabase/supabase-js";
import type { Profile } from "@prisma/client";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

type CurrentUserData = {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
};

export function useCurrentUser(): CurrentUserData {
  const supabase = getSupabaseBrowserClient();
  const queryClient = useQueryClient();

  const {
    data: user,
    isLoading: isUserLoading,
    error: userError,
    refetch: refetchUser,
  } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      return user;
    },
  });

  const {
    data: profile,
    isLoading: isProfileLoading,
    error: profileError,
  } = useQuery({
    queryKey: ['userProfile', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const response = await fetch(`/api/profile/${user!.id}`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          // If profile doesn't exist, create one
          const createResponse = await fetch('/api/profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: user!.id,
              firstName: user!.user_metadata?.name || '',
              lastName: '',
              avatarUrl: user!.user_metadata?.avatar_url || '',
            }),
            credentials: 'include',
          });
          
          if (!createResponse.ok) {
            throw new Error('Failed to create profile');
          }
          const data = await createResponse.json();
          return data.profile;
        }
        throw new Error('Failed to fetch profile');
      }
      const data = await response.json();
      return data.profile;
    },
  });

  // Listen for auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          await queryClient.invalidateQueries({ queryKey: ['currentUser'] });
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [queryClient, supabase.auth]);

  return {
    user: user ?? null,
    profile: profile ?? null,
    isLoading: isUserLoading || (!!user && isProfileLoading),
    error: userError || profileError || null,
    refetch: async () => {
      await refetchUser();
    },
  };
}
