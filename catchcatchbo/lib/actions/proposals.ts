"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  resend,
  ADMIN_NOTIFICATION_EMAIL,
  RESEND_FROM_EMAIL,
} from "@/lib/mail/resend";
import {
  createGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
} from "@/lib/google/calendar";
import {
  formatKoreanDate,
  formatTimeRange,
  getMeetingTypeLabel,
} from "@/lib/utils";
import type {
  ActionResult,
  Booking,
  DateProposal,
} from "@/lib/types";

// ============================================================
// 친구가 날짜 제안
// ============================================================

export async function createProposal(
  formData: FormData
): Promise<ActionResult> {
  const guestName =
    (
      formData.get("guest_name") as string
    )?.trim();

  const guestContact =
    (
      formData.get("guest_contact") as string
    )?.trim() || null;

  const bookingTitle =
    (
      formData.get("booking_title") as string
    )?.trim();

  const proposedDate =
    (
      formData.get("proposed_date") as string
    )?.trim();

  const proposedTime =
    (
      formData.get("proposed_time") as string
    )?.trim();

  const proposedEndTime =
    (
      formData.get("proposed_end_time") as string
    )?.trim();

  const guestCount = Number(
    formData.get("guest_count") ?? 1
  );

  const meetingType =
    (
      formData.get("meeting_type") as string
    )?.trim();

  const note =
    (
      formData.get("note") as string
    )?.trim() || null;

  if (!guestName) {
    return {
      success: false,
      error: "이름을 입력해주세요.",
    };
  }

  if (!bookingTitle) {
    return {
      success: false,
      error: "약속 이름을 입력해주세요.",
    };
  }

  if (!proposedDate) {
    return {
      success: false,
      error: "희망 날짜를 선택해주세요.",
    };
  }

  if (
    !proposedTime ||
    !proposedEndTime
  ) {
    return {
      success: false,
      error:
        "시작 시간과 종료 시간을 선택해주세요.",
    };
  }

  if (
    proposedEndTime <=
    proposedTime
  ) {
    return {
      success: false,
      error:
        "종료 시간은 시작 시간보다 늦어야 해요.",
    };
  }

  if (
    !Number.isInteger(guestCount) ||
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
        timeZone: "Asia/Seoul",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }
    ).format(new Date());

  if (proposedDate < todayKST) {
    return {
      success: false,
      error:
        "지난 날짜는 제안할 수 없어요.",
    };
  }

  const supabase =
    await createClient();

  const { error: insertError } =
    await supabase
      .from("date_proposals")
      .insert({
        id: randomUUID(),
        guest_name: guestName,
        guest_contact: guestContact,
        proposed_date:
          proposedDate,
        proposed_time:
          proposedTime,
        proposed_end_time:
          proposedEndTime,
        booking_title:
          bookingTitle,
        guest_count:
          guestCount,
        meeting_type:
          meetingType,
        note,
        status: "pending",
      });

  if (insertError) {
    console.error(
      "createProposal error:",
      insertError
    );

    return {
      success: false,
      error: `DB 오류: ${insertError.message}`,
    };
  }

  // 관리자 이메일
  if (
    resend &&
    ADMIN_NOTIFICATION_EMAIL
  ) {
    const adminUrl = `${
      process.env.NEXT_PUBLIC_SITE_URL ??
      "https://catch-catchbo.vercel.app"
    }/admin`;

    const text = `새로운 날짜 제안이 들어왔어요.

신청자: ${guestName}
약속 이름: ${bookingTitle}
인원: ${guestCount}명
날짜: ${formatKoreanDate(proposedDate)}
시간: ${formatTimeRange(
      proposedTime,
      proposedEndTime
    )}
약속 유형: ${getMeetingTypeLabel(meetingType)}
연락처: ${guestContact || "입력하지 않음"}
메모: ${note || "입력하지 않음"}

관리자 페이지:
${adminUrl}`;

    const { error: mailError } =
      await resend.emails.send({
        from: RESEND_FROM_EMAIL,
        to: ADMIN_NOTIFICATION_EMAIL,
        subject:
          `[캐치캐치보] ${guestName}님의 날짜 제안`,
        text,
      });

    if (mailError) {
      console.error(
        "Proposal email error:",
        mailError
      );
    }
  }

  revalidatePath("/admin");

  return {
    success: true,
  };
}

// ============================================================
// 관리자가 날짜 제안 수락
// ============================================================

export async function acceptProposal(
  proposalId: string
): Promise<
  ActionResult<{
    proposal: DateProposal;
    booking: Booking;
  }>
> {
  const supabase =
    await createClient();

  const {
    data: { user },
    error: authError,
  } =
    await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      error:
        "로그인이 필요해요.",
    };
  }

  // 제안 조회
  const {
    data: proposal,
    error: proposalError,
  } = await supabase
    .from("date_proposals")
    .select("*")
    .eq("id", proposalId)
    .eq("status", "pending")
    .single();

  if (
    proposalError ||
    !proposal
  ) {
    return {
      success: false,
      error:
        "수락할 날짜 제안을 찾을 수 없어요.",
    };
  }

  if (
    !proposal.proposed_time ||
    !proposal.proposed_end_time
  ) {
    return {
      success: false,
      error:
        "시작/종료 시간이 없는 제안이에요.",
    };
  }

  const slotId = randomUUID();
  const bookingId = randomUUID();
  const now =
    new Date().toISOString();

  // 제안으로 슬롯 생성
  const { error: slotError } =
    await supabase
      .from("available_slots")
      .insert({
        id: slotId,
        owner_id: user.id,
        date:
          proposal.proposed_date,
        start_time:
          proposal.proposed_time,
        end_time:
          proposal.proposed_end_time,
        title:
          proposal.booking_title,
        meeting_type:
          proposal.meeting_type,
        description:
          proposal.note,
        location_text: "tbd",
        max_guests: 1,
        is_active: false,
        created_at: now,
        updated_at: now,
      });

  if (slotError) {
    console.error(
      "Proposal slot create error:",
      slotError
    );

    return {
      success: false,
      error:
        "제안 일정 생성에 실패했어요.",
    };
  }

  // confirmed 예약 생성
  const { error: bookingError } =
    await supabase
      .from("bookings")
      .insert({
        id: bookingId,
        slot_id: slotId,
        guest_name:
          proposal.guest_name,
        guest_contact:
          proposal.guest_contact,
        booking_title:
          proposal.booking_title,
        guest_count:
          proposal.guest_count,
        meeting_type:
          proposal.meeting_type,
        note:
          proposal.note,
        status: "confirmed",
        created_at: now,
        canceled_at: null,
      });

  if (bookingError) {
  console.error(
    "Proposal booking create error:",
    bookingError
  );

  await supabase
    .from("available_slots")
    .delete()
    .eq("id", slotId);

  return {
    success: false,
    error:
      "예약 생성에 실패했어요.",
  };
}

  const booking: Booking = {
    id: bookingId,
    slot_id: slotId,

    guest_name:
      proposal.guest_name,

    guest_contact:
      proposal.guest_contact,

    booking_title:
      proposal.booking_title,

    guest_count:
      proposal.guest_count,

    meeting_type:
      proposal.meeting_type,

    note:
      proposal.note,

    status: "confirmed",

    created_at: now,

    canceled_at: null,

    available_slots: {
      date:
        proposal.proposed_date,

      start_time:
        proposal.proposed_time,

      end_time:
        proposal.proposed_end_time,

      title:
        proposal.booking_title,

      location_text: "tbd",

      meeting_type:
        proposal.meeting_type,
    },
  };

  // Google Calendar 생성
  let calendarEventId: string;

  try {
    calendarEventId =
      await createGoogleCalendarEvent(
        booking
      );
  } catch (calendarError) {
    console.error(
      "Proposal Calendar error:",
      calendarError
    );

    // 예약/슬롯 롤백
    await supabase
      .from("bookings")
      .delete()
      .eq("id", bookingId);

    await supabase
      .from("available_slots")
      .delete()
      .eq("id", slotId);

    return {
      success: false,
      error:
        calendarError instanceof Error
          ? calendarError.message
          : "Google Calendar 등록에 실패했어요.",
    };
  }

  // 캘린더 ID 저장
  const { error: calendarIdError } =
    await supabase
      .from("bookings")
      .update({
        google_calendar_event_id:
          calendarEventId,
      })
      .eq("id", bookingId);

  if (calendarIdError) {
    console.error(
      "Proposal Calendar ID save error:",
      calendarIdError
    );

    try {
      await deleteGoogleCalendarEvent(
        calendarEventId
      );
    } catch (error) {
      console.error(
        "Proposal Calendar rollback error:",
        error
      );
    }

    await supabase
      .from("bookings")
      .delete()
      .eq("id", bookingId);

    await supabase
      .from("available_slots")
      .delete()
      .eq("id", slotId);

    return {
      success: false,
      error:
        "Google Calendar 정보를 저장하지 못했어요.",
    };
  }

  // 마지막에 proposal accepted 처리
  const {
    data: acceptedProposal,
    error: acceptError,
  } = await supabase
    .from("date_proposals")
    .update({
      status: "accepted",
    })
    .eq("id", proposalId)
    .eq("status", "pending")
    .select("*")
    .single();

  if (
    acceptError ||
    !acceptedProposal
  ) {
    console.error(
      "Proposal accept error:",
      acceptError
    );

    try {
      await deleteGoogleCalendarEvent(
        calendarEventId
      );
    } catch (error) {
      console.error(
        "Proposal final rollback Calendar error:",
        error
      );
    }

    await supabase
      .from("bookings")
      .delete()
      .eq("id", bookingId);

    await supabase
      .from("available_slots")
      .delete()
      .eq("id", slotId);

    return {
      success: false,
      error:
        "날짜 제안 확정 처리에 실패했어요.",
    };
  }

  revalidatePath("/admin");
  revalidatePath("/book");

  return {
    success: true,
    data: {
      proposal:
        acceptedProposal as DateProposal,
      booking,
    },
  };
}

// ============================================================
// 관리자가 날짜 제안 거절
// ============================================================

export async function rejectProposal(
  proposalId: string
): Promise<
  ActionResult<{
    proposal: DateProposal;
  }>
> {
  const supabase =
    await createClient();

  const {
    data: { user },
    error: authError,
  } =
    await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      error:
        "로그인이 필요해요.",
    };
  }

  const {
    data,
    error,
  } = await supabase
    .from("date_proposals")
    .update({
      status: "rejected",
    })
    .eq("id", proposalId)
    .eq("status", "pending")
    .select("*")
    .single();

  if (error || !data) {
    console.error(
      "rejectProposal error:",
      error
    );

    return {
      success: false,
      error:
        "날짜 제안 거절 중 오류가 발생했어요.",
    };
  }

  revalidatePath("/admin");

  return {
    success: true,
    data: {
      proposal:
        data as DateProposal,
    },
  };
}
