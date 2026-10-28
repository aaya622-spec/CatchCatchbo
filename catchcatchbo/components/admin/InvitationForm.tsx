"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createInvitation } from "@/lib/actions/invitations";
import { getTodayKST } from "@/lib/utils";
import { MEETING_TYPES } from "@/lib/constants";
export default function InvitationForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [date, setDate] = useState(getTodayKST());
  const [endDate, setEndDate] = useState(getTodayKST());
  return <form className="flex flex-col gap-5" onSubmit={e => {
    e.preventDefault(); const form = new FormData(e.currentTarget); setError("");
    start(async () => { try {
      const result = await createInvitation(form);
      if (!result.success) { setError(result.error || "등록하지 못했어요."); return; }
      router.push("/admin?tab=schedule#invitations"); router.refresh();
    } catch { setError("등록 결과를 확인하지 못했어요. 관리자 일정에서 초대 생성 여부를 확인해주세요."); } });
  }}>
    <label>약속 제목<input className="input-base mt-2" name="title" required maxLength={40} placeholder="주말 저녁 같이 먹자" /></label>
    <div className="grid grid-cols-2 gap-3">
      <label>시작일<input className="input-base mt-2" type="date" name="date" required min={getTodayKST()} value={date} onChange={e => { setDate(e.target.value); if (endDate < e.target.value) setEndDate(e.target.value); }} /></label>
      <label>종료일<input className="input-base mt-2" type="date" name="end_date" required min={date} value={endDate} onChange={e => setEndDate(e.target.value)} /></label>
    </div>
    <label>참석자 이름<textarea className="input-base mt-2" name="names" required maxLength={100} rows={4} placeholder={"민지\n수연"} /><span className="block text-xs text-warm-gray-500 mt-2">한 줄에 한 명씩, 1~4명을 입력해주세요. 각자에게 다른 초대 링크를 보내요.</span></label>
    <label>장소<input className="input-base mt-2" name="location_text" required maxLength={200} defaultValue="장소 미정" /></label>
    <label>약속 종류<select className="input-base mt-2" name="meeting_type" defaultValue="hangout">{MEETING_TYPES.filter(t => t.value !== "custom").map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></label>
    <label>메모<textarea className="input-base mt-2" name="note" maxLength={2000} rows={3} /></label>
    <p className="text-sm text-warm-gray-500">응답을 기다리는 동안 날짜를 비워둘게요. 전원이 수락하면 약속이 확정되고, 한 명이라도 거절하면 초대가 마감돼요.</p>
    {error && <p role="alert" className="text-red-500 text-sm">{error}</p>}
    <button className="btn-primary" disabled={pending}>{pending ? "등록 중…" : "약속 등록하고 초대 링크 만들기"}</button>
  </form>;
}
