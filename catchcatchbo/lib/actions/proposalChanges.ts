"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  resend,
  ADMIN_NOTIFICATION_EMAIL,
  RESEND_FROM_EMAIL,
} from "@/lib/mail/resend";
import {
  formatKoreanDate,
  getMeetingTypeLabel,
} from "@/lib/utils";
import type { ActionResult } from "@/lib/types";

// ============================================================
// 날짜 범위 표시
// ============================================================

function formatDateRange(
  startDate: string,
  endDate: string
): string {
  if (
    !endDate ||
    startDate === endDate
  ) {
    return formatKoreanDate(
      startDate
    );
  }

  return `${formatKoreanDate(
    startDate
  )} ~ ${formatKoreanDate(
    endDate
  )}`;
}

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
      error:
        "제안 정보가 올바르지 않아요.",
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

  const guestCount =
    Number(
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

  if (!bookingTitle) {
    return {
      success: false,
      error:
        "약속 이름을 입력해주세요.",
    };
  }

  if (
    bookingTitle.length > 40
  ) {
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

  const {
    data: proposal,
    error: proposalError,
  } = await supabase
    .from(
      "date_proposals"
    )
    .select(`
      id,
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

  const changeRequestId =
    randomUUID();

  const {
    error: insertError,
  } = await supabase
    .from(
      "proposal_change_requests"
    )
    .insert({
      id:
        changeRequestId,

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

  if (
    resend &&
    ADMIN_NOTIFICATION_EMAIL
  ) {
    const adminUrl =
      `${
        process.env
          .NEXT_PUBLIC_SITE_URL ??
        "https://catch-catchbo.vercel.app"
      }/admin`;

    const oldDateRange =
      formatDateRange(
        proposal.proposed_date,
        proposal.proposed_end_date ??
          proposal.proposed_date
      );

    const newDateRange =
      formatDateRange(
        proposedDate,
        proposedEndDate
      );

    const text = `날짜 제안 변경 요청이 들어왔어요.

신청자: ${proposal.guest_name}
연락처: ${
      proposal.guest_contact ??
      "입력하지 않음"
    }

[기존 제안]
약속 이름: ${proposal.booking_title}
날짜: ${oldDateRange}
인원: ${proposal.guest_count}명
약속 유형: ${getMeetingTypeLabel(
      proposal.meeting_type
    )}
메모: ${
      proposal.note ??
      "입력하지 않음"
    }

[변경 요청]
약속 이름: ${bookingTitle}
날짜: ${newDateRange}
인원: ${guestCount}명
약속 유형: ${getMeetingTypeLabel(
      meetingType
    )}
메모: ${
      note ??
      "입력하지 않음"
    }

관리자 페이지:
${adminUrl}`;

    const {
      error: mailError,
    } =
      await resend.emails.send({
        from:
          RESEND_FROM_EMAIL,

        to:
          ADMIN_NOTIFICATION_EMAIL,

        subject:
          `[캐치캐치보] ${proposal.guest_name}님의 변경 요청`,

        text,
      });

    if (mailError) {
      console.error(
        "Proposal change email error:",
        mailError
      );
    }
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

// ============================================================
// 관리자가 변경 요청 수락
// ============================================================

export async function acceptProposalChangeRequest(
  requestId: string
): Promise<ActionResult> {
  if (!requestId) {
    return {
      success: false,
      error:
        "변경 요청 정보가 올바르지 않아요.",
    };
  }

  const supabase =
    createAdminClient();

  const {
    data: request,
    error: requestError,
  } = await supabase
    .from(
      "proposal_change_requests"
    )
    .select(`
      id,
      proposal_id,
      booking_title,
      proposed_date,
      proposed_end_date,
      guest_count,
      meeting_type,
      note,
      status
    `)
    .eq(
      "id",
      requestId
    )
    .eq(
      "status",
      "pending"
    )
    .single();

  if (
    requestError ||
    !request
  ) {
    console.error(
      "Proposal change request lookup error:",
      requestError
    );

    return {
      success: false,
      error:
        "처리할 변경 요청을 찾을 수 없어요.",
    };
  }

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
      "id",
      request.proposal_id
    )
    .single();

  if (
    proposalError ||
    !proposal
  ) {
    return {
      success: false,
      error:
        "원래 날짜 제안을 찾을 수 없어요.",
    };
  }

  if (
    proposal.status !==
    "pending"
  ) {
    return {
      success: false,
      error:
        "이미 처리된 날짜 제안이에요.",
    };
  }

  // 원본 날짜 제안에 변경 내용 반영
  const {
    error: updateProposalError,
  } = await supabase
    .from(
      "date_proposals"
    )
    .update({
      booking_title:
        request.booking_title,

      proposed_date:
        request.proposed_date,

      proposed_end_date:
        request.proposed_end_date,

      guest_count:
        request.guest_count,

      meeting_type:
        request.meeting_type,

      note:
        request.note,
    })
    .eq(
      "id",
      request.proposal_id
    )
    .eq(
      "status",
      "pending"
    );

  if (
    updateProposalError
  ) {
    console.error(
      "Proposal change apply error:",
      updateProposalError
    );

    return {
      success: false,
      error:
        "변경 내용을 적용하지 못했어요.",
    };
  }

  // 요청 수락 처리
  const {
    error: acceptError,
  } = await supabase
    .from(
      "proposal_change_requests"
    )
    .update({
      status:
        "accepted",

      resolved_at:
        new Date().toISOString(),

      updated_at:
        new Date().toISOString(),
    })
    .eq(
      "id",
      requestId
    )
    .eq(
      "status",
      "pending"
    );

  if (acceptError) {
    console.error(
      "Proposal change accept error:",
      acceptError
    );

    return {
      success: false,
      error:
        "변경 요청 처리 중 오류가 발생했어요.",
    };
  }

  revalidatePath(
    "/admin"
  );

  revalidatePath(
    "/book"
  );

  return {
    success: true,
  };
}

// ============================================================
// 관리자가 변경 요청 거절
// ============================================================

export async function rejectProposalChangeRequest(
  requestId: string
): Promise<ActionResult> {
  if (!requestId) {
    return {
      success: false,
      error:
        "변경 요청 정보가 올바르지 않아요.",
    };
  }

  const supabase =
    createAdminClient();

  const {
    error,
  } = await supabase
    .from(
      "proposal_change_requests"
    )
    .update({
      status:
        "rejected",

      resolved_at:
        new Date().toISOString(),

      updated_at:
        new Date().toISOString(),
    })
    .eq(
      "id",
      requestId
    )
    .eq(
      "status",
      "pending"
    );

  if (error) {
    console.error(
      "Proposal change reject error:",
      error
    );

    return {
      success: false,
      error:
        "변경 요청을 거절하지 못했어요.",
    };
  }

  revalidatePath(
    "/admin"
  );

  revalidatePath(
    "/book"
  );

  return {
    success: true,
  };
}
