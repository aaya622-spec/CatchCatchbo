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
  getLocationLabel,
  getMeetingTypeLabel,
} from "@/lib/utils";
import type {
  ActionResult,
  Booking,
} from "@/lib/types";

type BookingWithCalendarEvent = Booking & {
  google_calendar_event_id?: string | null;
};

/**
 * 새 예약 요청 이메일 전송
 * 메일 발송 실패는 예약 실패로 처리하지 않습니다.
 */
async function sendBookingRequestEmail(
  booking: Booking
): Promise<void> {
  if (!resend || !ADMIN_NOTIFICATION_EMAIL) {
    console.error(
      "Booking email skipped: Resend environment variables are missing."
    );
    return;
  }

  const slot = booking.available_slots;

  if (!slot) {
    console.error(
      "Booking email skipped: slot information is missing."
    );
    return;
  }

  const adminUrl = `${
    process.env.NEXT_PUBLIC_SITE_URL ??
    "https://catch-catchbo.vercel.app"
  }/admin`;

  const contact =
    booking.guest_contact || "입력하지 않음";

  const note =
    booking.note || "입력하지 않음";

  const subject =
    `[캐치캐치보] ${booking.guest_name}님의 새 예약 요청`;

  const text = `새 예약 요청이 들어왔어요.

신청자: ${booking.guest_name}
날짜: ${formatKoreanDate(slot.date)}
시간: ${formatTimeRange(
    slot.start_time,
    slot.end_time
  )}
약속: ${getMeetingTypeLabel(
    booking.meeting_type
  )}
장소: ${getLocationLabel(
    slot.location_text
  )}
연락처: ${contact}
메모: ${note}

관리자 페이지:
${adminUrl}`;

  const { error } = await resend.emails.send({
    from: RESEND_FROM_EMAIL,
    to: ADMIN_NOTIFICATION_EMAIL,
    subject,
    text,
  });

  if (error) {
    console.error(
      "sendBookingRequestEmail error:",
      error
    );
  }
}

/**
 * 친구가 예약 신청
 */
export async function createBooking(
  slotId: string,
  formData: FormData
): Promise<
  ActionResult<{
    booking: Booking;
  }>
> {
  const guestName =
    (
      formData.get(
        "guest_name"
      ) as string
    )?.trim();

  const guestContact =
    (
      formData.get(
        "guest_contact"
      ) as string
    )?.trim() || null;

  const meetingType =
    (
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

  if (!guestName) {
    return {
      success: false,
      error: "이름을 입력해주세요.",
    };
  }

  if (guestName.length > 20) {
    return {
      success: false,
      error:
        "이름은 20자 이내로 입력해주세요.",
    };
  }

  if (!meetingType) {
    return {
      success: false,
      error:
        "약속 유형을 선택해주세요.",
    };
  }

  if (!slotId) {
    return {
      success: false,
      error:
        "일정 정보가 올바르지 않아요.",
    };
  }

  const supabase =
    await createClient();

  // 선택한 일정 확인
  const {
    data: slot,
    error: slotError,
  } = await supabase
    .from("available_slots")
    .select(`
      id,
      is_active,
      date,
      start_time,
      end_time,
      title,
      location_text,
      meeting_type,
      max_guests
    `)
    .eq("id", slotId)
    .single();

  if (slotError || !slot) {
    return {
      success: false,
      error:
        "존재하지 않는 일정이에요.",
    };
  }

  if (!slot.is_active) {
    return {
      success: false,
      error:
        "비활성화된 일정이에요.",
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

  if (slot.date < todayKST) {
    return {
      success: false,
      error:
        "이미 지난 날짜예요.",
    };
  }

  // 확정된 예약만 인원수에 포함
  const { count } =
    await supabase
      .from("bookings")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("slot_id", slotId)
      .eq("status", "confirmed");

  if (
    (count ?? 0) >=
    slot.max_guests
  ) {
    return {
      success: false,
      error:
        "이미 예약이 꽉 찼어요. 다른 날을 선택해줘요.",
    };
  }

  const bookingId =
    randomUUID();

  const createdAt =
    new Date().toISOString();

  /*
   * 비로그인 사용자는 bookings SELECT 권한이 없으므로
   * insert 후 select를 실행하지 않습니다.
   */
  const { error: insertError } =
    await supabase
      .from("bookings")
      .insert({
        id: bookingId,
        slot_id: slotId,
        guest_name: guestName,
        guest_contact:
          guestContact,
        meeting_type:
          meetingType,
        note,
        status: "pending",
        created_at: createdAt,
      });

  if (insertError) {
    console.error(
      "createBooking error:",
      insertError
    );

    const message =
      insertError.message?.includes(
        "이미 예약이 꽉 찼어요"
      )
        ? "이미 예약이 꽉 찼어요. 다른 날을 선택해줘요."
        : insertError.message?.includes(
              "지난 날짜"
            )
          ? "이미 지난 날짜예요."
          : "예약 신청 중 오류가 발생했어요. 다시 시도해주세요.";

    return {
      success: false,
      error: message,
    };
  }

  const booking: Booking = {
    id: bookingId,
    slot_id: slotId,
    guest_name: guestName,
    guest_contact:
      guestContact,
    meeting_type:
      meetingType,
    note,
    status: "pending",
    created_at: createdAt,
    canceled_at: null,
    available_slots: {
      date: slot.date,
      start_time:
        slot.start_time,
      end_time: slot.end_time,
      title: slot.title,
      location_text:
        slot.location_text,
      meeting_type:
        slot.meeting_type,
    },
  };

  // 메일 실패는 예약 실패로 처리하지 않음
  await sendBookingRequestEmail(
    booking
  );

  revalidatePath("/book");
  revalidatePath("/admin");

  return {
    success: true,
    data: {
      booking,
    },
  };
}

/**
 * 관리자가 예약 확정
 *
 * 1. 예약 정보 조회
 * 2. Google Calendar 일정 생성
 * 3. 예약 상태를 confirmed로 변경
 * 4. Calendar 이벤트 ID 저장
 */
export async function confirmBooking(
  bookingId: string
): Promise<
  ActionResult<{
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

  if (!bookingId) {
    return {
      success: false,
      error:
        "예약 정보가 올바르지 않아요.",
    };
  }

  // 먼저 pending 예약 정보 조회
  const {
    data: pendingBooking,
    error: bookingError,
  } = await supabase
    .from("bookings")
    .select(`
      id,
      slot_id,
      guest_name,
      guest_contact,
      meeting_type,
      note,
      status,
      created_at,
      canceled_at,
      google_calendar_event_id,
      available_slots (
        date,
        start_time,
        end_time,
        title,
        location_text,
        meeting_type
      )
    `)
    .eq("id", bookingId)
    .eq("status", "pending")
    .single();

  if (
    bookingError ||
    !pendingBooking
  ) {
    console.error(
      "confirmBooking lookup error:",
      bookingError
    );

    return {
      success: false,
      error:
        "확정할 예약을 찾을 수 없어요.",
    };
  }

  const bookingForCalendar =
    pendingBooking as unknown as BookingWithCalendarEvent;

  let calendarEventId: string;

  // Google Calendar 일정 생성
  try {
    calendarEventId =
      await createGoogleCalendarEvent(
        bookingForCalendar
      );
  } catch (calendarError) {
    console.error(
      "Google Calendar create error:",
      calendarError
    );

    const errorMessage =
      calendarError instanceof Error
        ? calendarError.message
        : "Google Calendar 일정 생성에 실패했어요.";

    return {
      success: false,
      error: errorMessage,
    };
  }

  // 캘린더 생성 후 예약 확정 및 이벤트 ID 저장
  const {
    data: confirmedBooking,
    error: confirmError,
  } = await supabase
    .from("bookings")
    .update({
      status: "confirmed",
      canceled_at: null,
      google_calendar_event_id:
        calendarEventId,
    })
    .eq("id", bookingId)
    .eq("status", "pending")
    .select(`
      id,
      slot_id,
      guest_name,
      guest_contact,
      meeting_type,
      note,
      status,
      created_at,
      canceled_at,
      google_calendar_event_id,
      available_slots (
        date,
        start_time,
        end_time,
        title,
        location_text,
        meeting_type
      )
    `)
    .single();

  if (
    confirmError ||
    !confirmedBooking
  ) {
    console.error(
      "confirmBooking update error:",
      confirmError
    );

    /*
     * 캘린더는 생성됐지만 DB 확정이 실패한 경우
     * 방금 생성한 캘린더 일정을 다시 삭제합니다.
     */
    try {
      await deleteGoogleCalendarEvent(
        calendarEventId
      );
    } catch (deleteError) {
      console.error(
        "Calendar rollback error:",
        deleteError
      );
    }

    const message =
      confirmError?.message?.includes(
        "이미 예약이 꽉 찼어요"
      )
        ? "이미 예약 인원이 가득 찼어요."
        : "예약 확정 중 오류가 발생했어요.";

    return {
      success: false,
      error: message,
    };
  }

  revalidatePath("/admin");
  revalidatePath("/book");

  return {
    success: true,
    data: {
      booking:
        confirmedBooking as unknown as Booking,
    },
  };
}

/**
 * 관리자가 예약 거절 또는 취소
 *
 * 확정된 예약에 Google Calendar 이벤트가 있으면
 * Calendar에서도 함께 삭제합니다.
 */
export async function cancelBooking(
  bookingId: string
): Promise<ActionResult> {
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

  if (!bookingId) {
    return {
      success: false,
      error:
        "예약 정보가 올바르지 않아요.",
    };
  }

  // 취소 전에 캘린더 이벤트 ID 조회
  const {
    data: existingBooking,
    error: lookupError,
  } = await supabase
    .from("bookings")
    .select(`
      id,
      status,
      google_calendar_event_id
    `)
    .eq("id", bookingId)
    .in("status", [
      "pending",
      "confirmed",
    ])
    .single();

  if (
    lookupError ||
    !existingBooking
  ) {
    console.error(
      "cancelBooking lookup error:",
      lookupError
    );

    return {
      success: false,
      error:
        "취소할 예약을 찾을 수 없어요.",
    };
  }

  // 먼저 예약 상태 취소 처리
  const { error: cancelError } =
    await supabase
      .from("bookings")
      .update({
        status: "canceled",
        canceled_at:
          new Date().toISOString(),
      })
      .eq("id", bookingId)
      .in("status", [
        "pending",
        "confirmed",
      ]);

  if (cancelError) {
    console.error(
      "cancelBooking error:",
      cancelError
    );

    return {
      success: false,
      error:
        "예약 처리 중 오류가 발생했어요.",
    };
  }

  const calendarEventId =
    existingBooking.google_calendar_event_id;

  // 캘린더 이벤트가 있으면 삭제
  if (calendarEventId) {
    try {
      await deleteGoogleCalendarEvent(
        calendarEventId
      );

      const { error: clearError } =
        await supabase
          .from("bookings")
          .update({
            google_calendar_event_id:
              null,
          })
          .eq("id", bookingId);

      if (clearError) {
        console.error(
          "Calendar event ID clear error:",
          clearError
        );
      }
    } catch (calendarError) {
      /*
       * 캘린더 삭제 실패가 예약 취소 자체를
       * 되돌리지는 않도록 로그만 남깁니다.
       */
      console.error(
        "Google Calendar delete error:",
        calendarError
      );
    }
  }

  revalidatePath("/admin");
  revalidatePath("/book");

  return {
    success: true,
  };
}
