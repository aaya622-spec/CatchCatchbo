import "server-only";
import { createClient } from "@/lib/supabase/server";

// 현재 서비스는 관리자 한 명의 공개 일정표입니다.
// 기존 날짜 제안은 시간 없이 종일 요청이므로, 그 날짜의 일부 개인 일정과도 겹침 안내.
export async function checkProposalPersonalConflict(
  date: string,
  endDate: string,
): Promise<string | null> {
  const db = await createClient();
  const { data, error } = await db
    .from("personal_events")
    .select("id")
    .lte("date", endDate)
    .gte("end_date", date)
    .limit(1);
  if (error) return "개인 일정을 확인하지 못했어요. 잠시 후 다시 시도해주세요.";
  const { data: holds, error: holdsError } = await db.from("invitation_holds").select("id")
    .lte("date", endDate).gte("end_date", date).limit(1);
  if (holdsError) return "초대 일정을 확인하지 못했어요. 잠시 후 다시 시도해주세요.";
  if (holds?.length) return "이미 약속이 있거나 초대 응답을 기다리는 날짜예요. 다른 날짜를 제안해주세요.";
  return data?.length
    ? "선택한 날짜에 이미 개인 일정이 있어요. 달력에서 일정을 확인하고 다른 날짜를 제안해주세요."
    : null;
}
