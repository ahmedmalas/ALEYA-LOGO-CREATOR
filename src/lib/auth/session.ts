import { createClient } from "@/lib/supabase/server";

export type AuthState = {
  signedIn: boolean;
  userId: string | null;
  email: string | null;
};

/** Single server-derived auth snapshot for marketing + app shells. */
export async function getAuthState(): Promise<AuthState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return {
    signedIn: Boolean(user),
    userId: user?.id ?? null,
    email: user?.email ?? null,
  };
}
