"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cancelInvitation, retryInvitationCalendar } from "@/lib/actions/invitations";
import { formatKoreanDate, getLocationLabel } from "@/lib/utils";
import type { Invitation, Invitee } from "@/lib/invitations";
const statusText = { pending: "응답 대기", confirmed: "약속 확정", rejected: "거절로 마감", canceled: "초대 취소" };
const responseText = { pending: "응답 대기", accepted: "수락", declined: "거절" };
export default function InvitationManager({ invitations }: { invitations: Invitation[] }) {
  const router = useRouter(); const [pending, start] = useTransition(); const [message, setMessage] = useState("");
  async function share(invite: Invitation, person: Invitee) {
    const url = `${window.location.origin}/invite/${person.token}`;
    const date = formatKoreanDate(invite.date) + (invite.end_date !== invite.date ? ` ~ ${formatKoreanDate(invite.end_date)}` : "");
    const text = `🎯 캐치캐치보 약속 초대\n\n${person.name}님, 이날 같이 만나요!\n\n💬 ${invite.title}\n📅 ${date}\n📍 ${getLocationLabel(invite.location_text)}${invite.note ? `\n📝 ${invite.note}` : ""}\n\n아래 링크에서 수락 또는 거절을 눌러주세요. 전원이 수락하면 약속이 확정돼요.\n${url}`;
    setMessage("");
    if (navigator.share) {
      try { await navigator.share({ title: "캐치캐치보 약속 초대", text }); return; }
      catch (e) { if (e instanceof Error && e.name === "AbortError") return; }
    }
    try { await navigator.clipboard.writeText(text); setMessage(`${person.name}님 초대 메시지를 복사했어요. 카톡에 붙여넣어 주세요.`); }
    catch { setMessage("공유창을 열지 못했어요. 아래 초대 링크를 길게 눌러 복사해주세요."); }
  }
  return <section id="invitations" className="flex flex-col gap-3 scroll-mt-24">
    <div className="flex items-center justify-between gap-2"><h3 className="font-semibold text-warm-gray-700">💌 내가 보낸 약속 초대</h3><button className="text-xs text-peach-500" disabled={pending} onClick={() => router.refresh()}>응답 새로고침</button></div>
    <Link href="/admin/invitations/new" className="btn-secondary text-sm">+ 약속 직접 등록</Link>
    {message && <p role="status" className="text-sm whitespace-pre-wrap">{message}</p>}
    {!invitations.length && <p className="text-sm text-warm-gray-400">아직 보낸 초대가 없어요.</p>}
    {invitations.map(invite => <article key={invite.id} className="card p-5 border-l-4 border-amber-300">
      <p className="text-xs text-amber-600 mb-2">{statusText[invite.status]}</p>
      <h4 className="font-semibold">{invite.title}</h4>
      <p className="text-sm text-warm-gray-500 mt-2">{formatKoreanDate(invite.date)}{invite.end_date !== invite.date ? ` ~ ${formatKoreanDate(invite.end_date)}` : ""} · 종일</p>
      <p className="text-sm text-warm-gray-500 mt-2">📍 {getLocationLabel(invite.location_text)}</p>
      {invite.note && <p className="text-sm whitespace-pre-wrap mt-2">{invite.note}</p>}
      <div className="flex flex-col gap-3 mt-4">{[...invite.appointment_invitees].sort((a,b) => a.position-b.position).map(person => <div key={person.id} className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm">{person.name} · {responseText[person.status]}</span>
        {invite.status === "pending" && person.status === "pending" && <div className="flex items-center gap-3"><button type="button" disabled={pending} className="text-sm text-peach-500 font-semibold" onClick={() => { void share(invite, person); }}>카톡으로 초대 공유</button><Link href={`/invite/${person.token}`} className="text-xs text-warm-gray-400">초대 링크</Link></div>}
      </div>)}</div>
      {invite.calendar_error && <div className="mt-3"><p role="alert" className="text-sm text-red-500">{invite.calendar_error}</p><button type="button" disabled={pending} className="btn-secondary mt-2 text-sm" onClick={() => start(async () => { try { const r = await retryInvitationCalendar(invite.id); setMessage(r.success ? "캘린더에 반영했어요." : r.error || "연동 실패"); router.refresh(); } catch { setMessage("연결을 확인한 뒤 다시 시도해주세요."); } })}>캘린더 다시 연동</button></div>}
      {invite.status === "pending" && <button type="button" disabled={pending} className="text-sm text-red-500 mt-4" onClick={() => {
        if (!confirm("초대를 취소하고 날짜를 다시 열까요?")) return;
        start(async () => { try { const r = await cancelInvitation(invite.id); setMessage(r.success ? "초대를 취소했어요." : r.error || "취소 실패"); router.refresh(); } catch { setMessage("취소 결과를 확인하지 못했어요. 새로고침해주세요."); } });
      }}>초대 취소</button>}
    </article>)}
  </section>;
}
