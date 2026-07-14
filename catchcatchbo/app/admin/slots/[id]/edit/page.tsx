import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SlotForm from "@/components/admin/SlotForm";
import type { AvailableSlot } from "@/lib/types";

interface EditSlotPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditSlotPage({ params }: EditSlotPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: slot, error } = await supabase
    .from("available_slots")
    .select("*")
    .eq("id", id)
    .eq("owner_id", user.id)
    .single();

  if (error || !slot) notFound();

  return (
    <div className="min-h-screen pb-20">
      <header className="sticky top-0 z-10 bg-cream-100/90 backdrop-blur-sm border-b border-cream-200 px-5 py-4">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="btn-ghost p-2 -ml-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <h1 className="font-bold text-warm-gray-800">일정 수정</h1>
        </div>
      </header>

      <div className="px-5 pt-6">
        <SlotForm slot={slot as AvailableSlot} />
      </div>
    </div>
  );
}
