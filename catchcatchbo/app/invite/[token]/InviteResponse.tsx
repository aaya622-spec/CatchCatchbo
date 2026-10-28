"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { respondInvitation } from "@/lib/actions/invitations";
import { formatKoreanDate, getLocationLabel } from "@/lib/utils";
import type { InviteSnapshot } from "@/lib/invitations";
export default function InviteResponse({ invite, token }: { invite: InviteSnapshot; token: string }) {
  const router = useRouter(); const [current, setCurrent] = useState(invite);
  const [pending, start] = useTransition(); const [message, setMessage] = useState("");
  useEffect(() => setCurrent(invite), [invite]);
  useEffect(() => { if (current.status !== "pending") return; const timer = setInterval(() => router.refresh(), 10000); return () => clearInterval(timer); }, [current.status, router]);
  const labels = { pending: "응답을 기다리고 있어요", confirmed: "약속이 확정됐어요 🎉", rejected: "이번 초대는 마감됐어요", canceled: "초대가 취소됐어요" };
  function respond(accept: boolean) {
    if (!accept && !confirm("이번 약속 초대를 거절할까요? 초대 전체가 마감돼요.")) return;
    setMessage(""); start(async () => { try {
      const result = await respondInvitation(token, accept);
      if (!result.success || !result.data) { setMessage(result.error || "응답 저장 실패"); return; }
      setCurrent(result.data.invite); setMessage(result.data.warning || (result.data.invite.status === "confirmed" ? "전원이 수락해 약속이 확정됐어요!" : result.data.invite.status === "rejected" ? "이번 초대는 거절로 마감됐어요." : result.data.invite.status === "canceled" ? "취소되었거나 지난 초대예요." : "수락했어요. 다른 참석자의 응답을 기다려주세요."));
      router.refresh();
    } catch { setMessage("응답 결과를 확인하지 못했어요. 새로고침해서 상태를 확인해주세요."); } });
  }
  return <main className="min-h-screen px-5 py-10">
    <p className="text-sm text-peach-500 font-semibold">🎯 캐치캐치보 약속 초대</p>
    <h1 className="text-xl font-bold mt-5">{current.own_name}님, 함께 만나요!</h1>
    <article className="card p-5 border-l-4 border-amber-300 mt-5">
      <p role="status" className="text-sm text-amber-600 mb-2">{labels[current.status]}</p>
      <h2 className="font-semibold text-lg">{current.title}</h2>
      <p className="text-sm text-warm-gray-500 mt-2">{formatKoreanDate(current.date)}{current.end_date !== current.date ? ` ~ ${formatKoreanDate(current.end_date)}` : ""} · 종일</p>
      <p className="text-sm text-warm-gray-500 mt-2">📍 {getLocationLabel(current.location_text)}</p>
      {current.note && <p className="text-sm whitespace-pre-wrap mt-3">{current.note}</p>}
    </article>
    <section className="mt-5 flex flex-col gap-2"><h2 className="font-semibold text-sm">참석자 응답</h2>{current.participants.map((p, index) => <p key={index} className="text-sm text-warm-gray-600">{p.name} · {p.status === "accepted" ? "수락 ✓" : p.status === "declined" ? "거절" : "응답 대기"}</p>)}</section>
    {current.status === "pending" && current.own_status === "pending" && <div className="flex gap-3 mt-7"><button disabled={pending} className="btn-primary flex-1" onClick={() => respond(true)}>{pending ? "저장 중…" : "수락"}</button><button disabled={pending} className="btn-secondary" onClick={() => respond(false)}>거절</button></div>}
    {current.status === "pending" && current.own_status === "accepted" && <p className="text-sm text-warm-gray-500 mt-6">수락을 완료했어요. 다른 참석자의 응답을 기다리고 있어요.</p>}
    {message && <p role="status" className="text-sm mt-4 whitespace-pre-wrap">{message}</p>}
  </main>;
}
