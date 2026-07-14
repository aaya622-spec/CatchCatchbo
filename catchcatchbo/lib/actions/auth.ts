"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";

// 로그인
export async function signIn(formData: FormData): Promise<ActionResult> {
  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { success: false, error: "이메일과 비밀번호를 입력해주세요." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    if (error.message.includes("Invalid login")) {
      return { success: false, error: "이메일이나 비밀번호가 맞지 않아요." };
    }
    return { success: false, error: "로그인 중 오류가 발생했어요. 다시 시도해주세요." };
  }

  redirect("/admin");
}

// 로그아웃
export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
