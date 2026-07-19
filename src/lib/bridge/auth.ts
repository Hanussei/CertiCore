/**
 * Tauri boundary layer — Auth commands (Custom database table auth).
 * Every function mirrors a future Rust `#[tauri::command]`.
 */
import { supabase } from "@/lib/supabase";
import type { Result, User } from "@/types";

const SESSION_KEY = "certicore.session.v1";

// Helper to hash security answers securely using WebCrypto (SHA-256)
export async function hashAnswer(text: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(text.trim().toLowerCase());
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function signIn(username: string, password: string): Promise<Result<User>> {
  try {
    const cleanUsername = username.trim().toLowerCase();
    
    // 1. Hash the incoming password/PIN client-side
    const hashedPassword = await hashAnswer(password);

    // 2. Query custom authenticate_user RPC in Supabase
    const { data, error } = await supabase.rpc("authenticate_user", {
      p_username: cleanUsername,
      p_password_hash: hashedPassword,
    });

    if (error || !data || data.length === 0) {
      return { ok: false, error: { code: "unauthorized", message: error?.message || "Invalid username or security code." } };
    }

    const matchedUser = data[0];

    // 3. Enforce multi-tenant organization check against local active license
    const { getLicense } = await import("./license");
    const activeLicenseRes = await getLicense();
    const activeLicense = activeLicenseRes.ok ? activeLicenseRes.data : null;
    const userOrg = matchedUser.organization;

    if (activeLicense && userOrg && activeLicense.organization.toLowerCase() !== userOrg.toLowerCase()) {
      return {
        ok: false,
        error: {
          code: "unauthorized_organization",
          message: "Your account is not authorized to access this organization's workstation.",
        },
      };
    }

    const role = matchedUser.role === "manager" ? "manager" : "inspector";
    const name = matchedUser.name || "User";

    const user: User = {
      id: matchedUser.id,
      email: `${cleanUsername}@certicore.dev`,
      name: name,
      role: role,
      avatarInitials: name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2),
      forcePasswordChange: matchedUser.force_password_change || false,
    };

    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
    }

    // Update active device record with the inspector's name for identification
    if (activeLicense) {
      const devName = typeof window !== "undefined" ? window.navigator.userAgent.slice(0, 50) : "Desktop Client";
      try {
        await supabase
          .from("devices")
          .update({
            device_name: `${name} (${devName})`,
          })
          .eq("license_code", activeLicense.code)
          .eq("hardware_id", activeLicense.machineId);
      } catch (deviceUpdateErr) {
        console.error("Failed to update device inspector link:", deviceUpdateErr);
      }
    }

    return { ok: true, data: user };
  } catch (err: any) {
    return {
      ok: false,
      error: { code: "exception", message: err.message || "An unexpected error occurred during sign in." },
    };
  }
}

export async function signOut(): Promise<Result<null>> {
  if (typeof window !== "undefined") window.sessionStorage.removeItem(SESSION_KEY);
  return { ok: true, data: null };
}

export async function currentUser(): Promise<Result<User | null>> {
  if (typeof window === "undefined") return { ok: true, data: null };
  const raw = window.sessionStorage.getItem(SESSION_KEY);
  if (!raw) return { ok: true, data: null };
  try {
    return { ok: true, data: JSON.parse(raw) as User };
  } catch {
    return { ok: true, data: null };
  }
}

// First-time configuration setup: change default password (1234) and set security questions
export async function completeFirstTimeSetup(
  userId: string,
  newPassword: string,
  q1: string,
  ans1: string,
  q2: string,
  ans2: string
): Promise<Result<boolean>> {
  try {
    // 1. Hash password & answers on the client-side
    const newPasswordHash = await hashAnswer(newPassword);
    const hash1 = await hashAnswer(ans1);
    const hash2 = await hashAnswer(ans2);

    // 2. Update the user's database profile (clear force flag & save hashes)
    const { data, error } = await supabase.rpc("update_profile_setup", {
      p_user_id: userId,
      p_new_password_hash: newPasswordHash,
      p_q1: q1,
      p_ans1_hash: hash1,
      p_q2: q2,
      p_ans2_hash: hash2,
    });

    if (error || !data) {
      return { ok: false, error: { code: "profile_update_failed", message: error?.message || "Failed to update profile settings." } };
    }

    // Update active session memory
    const userRes = await currentUser();
    if (userRes.ok && userRes.data) {
      const updatedUser = { ...userRes.data, forcePasswordChange: false };
      window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(updatedUser));
    }

    return { ok: true, data: true };
  } catch (err: any) {
    return { ok: false, error: { code: "exception", message: err.message || "Failed to complete security setup." } };
  }
}

// Fetch security questions for resetting forgotten passwords
export async function getSecurityQuestions(username: string): Promise<Result<{ q1: string; q2: string }>> {
  try {
    const formattedUsername = username.trim().toLowerCase();
    const { data, error } = await supabase
      .from("user_profiles")
      .select("security_question_1, security_question_2")
      .eq("username", formattedUsername)
      .single();

    if (error || !data) {
      return { ok: false, error: { code: "not_found", message: "User credentials or security questions not found." } };
    }

    return {
      ok: true,
      data: {
        q1: data.security_question_1,
        q2: data.security_question_2,
      },
    };
  } catch (err: any) {
    return { ok: false, error: { code: "exception", message: err.message } };
  }
}

// Reset forgotten password using security question answers
export async function resetPasswordWithAnswers(
  username: string,
  ans1: string,
  ans2: string,
  newPassword: string
): Promise<Result<boolean>> {
  try {
    const formattedUsername = username.trim().toLowerCase();
    
    // Hash answers locally for comparison
    const hash1 = await hashAnswer(ans1);
    const hash2 = await hashAnswer(ans2);
    const newPasswordHash = await hashAnswer(newPassword);

    // Call RPC reset function
    const { data, error } = await supabase.rpc("reset_password_with_security_questions", {
      p_username: formattedUsername,
      p_answer_hash_1: hash1,
      p_answer_hash_2: hash2,
      p_new_password_hash: newPasswordHash,
    });

    if (error || !data) {
      return {
        ok: false,
        error: {
          code: "reset_failed",
          message: error?.message || "Answers are incorrect. Reset rejected.",
        },
      };
    }

    return { ok: true, data: true };
  } catch (err: any) {
    return { ok: false, error: { code: "exception", message: err.message } };
  }
}
