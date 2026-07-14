import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SlotForm from "@/components/admin/SlotForm";

export default async function NewSlotPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen pb-20">
      {/* 헤더 */}
      <header className="sticky top-0 z-10 bg-cream-100/90 backdrop-blur-sm border-b border-cream-200 px-5 py-4">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="btn-ghost p-2 -ml-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <h1 className="font-bold text-warm-gray-800">가능한 날 열기</h1>
        </div>
      </header>

      <div className="px-5 pt-6">
        <p className="text-sm text-warm-gray-500 mb-6">
          친구들이 선택할 수 있도록 날짜와 시간을 열어둬요 📅
        </p>
        <SlotForm />
      </div>
    </div>
  );
}
