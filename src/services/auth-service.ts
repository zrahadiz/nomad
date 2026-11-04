import { supabase } from "@/lib/supabase/client";

import * as WebBrowser from "expo-web-browser";

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) throw error;

  return data;
}

export async function register(
  email: string,
  password: string,
  full_name: string,
) {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: {
        full_name,
      },
    },
  });

  if (error) throw error;

  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();

  if (error) throw error;
}

export async function signInWithGoogle(): Promise<void> {
  const redirectTo = "nomad://auth/callback";

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error) throw error;

  if (!data.url) {
    throw new Error("Unable to create Google authentication URL.");
  }

  // Open the browser. The callback route will handle the returned code.
  await WebBrowser.openBrowserAsync(data.url);
}
