"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "@/lib/types";

// ============================================================
// 날짜 제안 변경 요청 생성
// ============================================================

export async function createProposalChangeRequest(
  token: string,
  formData: FormData
): Promise<ActionResult> {
  if (!token) {
    return {
      success: false,
      error: "제안 정보가 올바르지 않아요.",
    };
  }

  const bookingTitle = (
    formData.get(
      "booking_title"
    ) as string
  )?.trim();

  const proposedDate = (
    formData.get(
      "proposed_date"
    ) as string
  )?.trim();

  const proposedEndDate =
    (
      formData.get(
        "proposed_end_date"
      ) as string
    )?.trim() || proposedDate;

  const guestCount = Number(
    formData.get(
      "guest_count"
    ) ?? 1
  );

  const meetingType = (
    formData.get(
      "meeting_type"
    ) as string
  )?.trim();

  const note =
    (
      formData.get(
        "note"
      ) as string
    )?.trim() || null;

  // ============================================================
  // 입력값 검증
  // ============================================================

  if (!bookingTitle) {
    return {
      success: false,
      error: "약속 이름을 입력해주세요.",
    };
  }

  if (bookingTitle.length > 40) {
    return {
      success: false,
      error:
        "약속 이름은 40자 이내로 입력해주세요.",
    };
  }

  if (!proposedDate) {
    return {
      success: false,
      error:
        "희망 시작일을 선택해주세요.",
    };
  }

  if (!proposedEndDate) {
    return {
      success: false,
      error:
        "희망 종료일을 선택해주세요.",
    };
  }

  if (
    proposedEndDate <
    proposedDate
  ) {
    return {
      success: false,
      error:
        "종료일은 시작일보다 빠를 수 없어요.",
    };
  }

  if (
    !Number.isInteger(
      guestCount
    ) ||
    guestCount < 1 ||
    guestCount > 4
  ) {
    return {
      success: false,
      error:
        "인원은 1명에서 4명까지 선택해주세요.",
    };
  }

  if (!meetingType) {
    return {
      success: false,
      error:
        "약속 유형을 선택해주세요.",
    };
  }

  const todayKST =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          "Asia/Seoul",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }
    ).format(
      new Date()
    );

  if (
    proposedDate <
    todayKST
  ) {
    return {
      success: false,
      error:
        "지난 날짜로 변경할 수 없어요.",
    };
  }

  const supabase =
    createAdminClient();

  // ============================================================
  // manage_token으로 원본 제안 확인
  // ============================================================

  const {
    data: proposal,
    error: proposalError,
  } = await supabase
    .from(
      "date_proposals"
    )
    .select(`
      id,
      status
    `)
    .eq(
      "manage_token",
      token
    )
    .single();

  if (
    proposalError ||
    !proposal
  ) {
    console.error(
      "Proposal lookup error:",
      proposalError
    );

    return {
      success: false,
      error:
        "날짜 제안을 찾을 수 없어요.",
    };
  }

  // 최종 수락/거절된 제안은 변경 불가
  if (
    proposal.status !==
    "pending"
  ) {
    return {
      success: false,
      error:
        "이미 처리된 제안은 변경할 수 없어요.",
    };
  }

  // ============================================================
  // 기존 pending 변경 요청 확인
  // ============================================================

  const {
    data: existingRequest,
    error:
      existingRequestError,
  } = await supabase
    .from(
      "proposal_change_requests"
    )
    .select("id")
    .eq(
      "proposal_id",
      proposal.id
    )
    .eq(
      "status",
      "pending"
    )
    .maybeSingle();

  if (
    existingRequestError
  ) {
    console.error(
      "Change request lookup error:",
      existingRequestError
    );

    return {
      success: false,
      error:
        "변경 요청 확인 중 오류가 발생했어요.",
    };
  }

  if (existingRequest) {
    return {
      success: false,
      error:
        "이미 확인 중인 변경 요청이 있어요.",
    };
  }

  // ============================================================
  // 변경 요청 저장
  // ============================================================

  const {
    error: insertError,
  } = await supabase
    .from(
      "proposal_change_requests"
    )
    .insert({
      id:
        randomUUID(),

      proposal_id:
        proposal.id,

      booking_title:
        bookingTitle,

      proposed_date:
        proposedDate,

      proposed_end_date:
        proposedEndDate,

      guest_count:
        guestCount,

      meeting_type:
        meetingType,

      note,

      status:
        "pending",
    });

  if (insertError) {
    console.error(
      "createProposalChangeRequest error:",
      insertError
    );

    return {
      success: false,
      error:
        "변경 요청을 보내는 중 오류가 발생했어요.",
    };
  }

  revalidatePath(
    `/book/proposal/manage/${token}`
  );

  revalidatePath(
    "/admin"
  );

  return {
    success: true,
  };
}
