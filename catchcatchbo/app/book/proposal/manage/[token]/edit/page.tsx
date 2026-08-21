import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import ProposalChangeForm from "./ProposalChangeForm";

export const dynamic = "force-dynamic";

interface ProposalEditPageProps {
  params: Promise<{
    token: string;
  }>;
}

export default async function ProposalEditPage({
  params,
}: ProposalEditPageProps) {
  const { token } = await params;

  if (!token) {
    notFound();
  }

  const supabase =
    createAdminClient();

  // ============================================================
  // 원본 날짜 제안 조회
  // ============================================================

  const {
    data: proposal,
    error: proposalError,
  } = await supabase
    .from("date_proposals")
    .select(`
      id,
      manage_token,
      guest_name,
      guest_contact,
      booking_title,
      proposed_date,
      proposed_end_date,
      guest_count,
      meeting_type,
      note,
      status
    `)
    .eq("manage_token", token)
    .single();

  if (
    proposalError ||
    !proposal
  ) {
    console.error(
      "Proposal edit lookup error:",
      proposalError
    );

    notFound();
  }

  // ============================================================
  // pending 상태만 변경 요청 가능
  // ============================================================

  if (
    proposal.status !==
    "pending"
  ) {
    return (
      <div className="min-h-screen px-5 py-10">
        <div className="card p-6 text-center">
          <p className="text-4xl mb-4">
            🔒
          </p>

          <h1 className="text-xl font-bold text-warm-gray-800">
            변경할 수 없는 제안이에요
          </h1>

          <p className="text-sm text-warm-gray-500 mt-2 leading-relaxed">
            이미 수락되거나 거절된
            날짜 제안은 변경 요청을
            보낼 수 없어요.
          </p>

          <a
            href={`/book/proposal/manage/${token}`}
            className="btn-secondary w-full text-center mt-6"
          >
            제안으로 돌아가기
          </a>
        </div>
      </div>
    );
  }

  // ============================================================
  // 기존 pending 변경 요청 확인
  // ============================================================

  const {
    data: existingRequest,
    error: requestError,
  } = await supabase
    .from(
      "proposal_change_requests"
    )
    .select(`
      id,
      status
    `)
    .eq(
      "proposal_id",
      proposal.id
    )
    .eq(
      "status",
      "pending"
    )
    .maybeSingle();

  if (requestError) {
    console.error(
      "Existing proposal change request lookup error:",
      requestError
    );
  }

  // 이미 변경 요청이 있으면 새 요청 방지
  if (existingRequest) {
    return (
      <div className="min-h-screen px-5 py-10">
        <div className="card p-6 text-center">
          <p className="text-4xl mb-4">
            ⏳
          </p>

          <h1 className="text-xl font-bold text-warm-gray-800">
            이미 변경 요청을 보냈어요
          </h1>

          <p className="text-sm text-warm-gray-500 mt-2 leading-relaxed">
            관리자가 확인할 때까지
            조금만 기다려주세요.
          </p>

          <a
            href={`/book/proposal/manage/${token}`}
            className="btn-secondary w-full text-center mt-6"
          >
            제안으로 돌아가기
          </a>
        </div>
      </div>
    );
  }

  return (
    <ProposalChangeForm
      token={token}
      proposal={{
        booking_title:
          proposal.booking_title,

        proposed_date:
          proposal.proposed_date,

        proposed_end_date:
          proposal.proposed_end_date ??
          proposal.proposed_date,

        guest_count:
          proposal.guest_count,

        meeting_type:
          proposal.meeting_type,

        note:
          proposal.note ?? "",
      }}
    />
  );
}
