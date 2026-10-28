import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import InvitationForm from "@/components/admin/InvitationForm";
export default async function NewInvitationPage() {
  const db = await createClient(); const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/login");
  return <main className="min-h-screen px-5 pt-6 pb-20">
    <Link href="/admin?tab=schedule" className="text-sm text-warm-gray-500">‹ 일정으로</Link>
    <h1 className="font-bold text-xl mt-5">약속 직접 등록</h1>
    <p className="text-sm text-warm-gray-500 mt-2 mb-6">카톡으로 초대 링크를 공유하고 친구들의 수락을 받아요.</p>
    <InvitationForm />
  </main>;
}
