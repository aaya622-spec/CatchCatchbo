import { createClient } from "@/lib/supabase/server";
import type { Booking } from "@/lib/types";

type GoogleTokenResponse = {
  access_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
};

type GoogleCalendarEventResponse = {
  id?: string;
  error?: {
    message?: string;
  };
};

// ============================================================
// Google Access Token
// ============================================================

async function getGoogleAccessToken(): Promise<string> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error(
      "로그인이 필요해요."
    );
  }

  const {
    data: token,
    error,
  } = await supabase
    .from("google_tokens")
    .select(
      "access_token, refresh_token, expiry_date"
    )
    .eq("user_id", user.id)
    .single();

  if (error || !token) {
    throw new Error(
      "Google Calendar가 연결되지 않았어요. 관리자 화면에서 다시 연결해주세요."
    );
  }

  const expiryDate =
    Number(
      token.expiry_date ??
        0
    );

  // 아직 유효한 토큰이면 그대로 사용
  if (
    token.access_token &&
    expiryDate >
      Date.now() +
        60_000
  ) {
    return token.access_token;
  }

  if (!token.refresh_token) {
    throw new Error(
      "Google Calendar 연결이 만료됐어요. 다시 연결해주세요."
    );
  }

  const clientId =
    process.env
      .GOOGLE_CLIENT_ID
      ?.trim();

  const clientSecret =
    process.env
      .GOOGLE_CLIENT_SECRET
      ?.trim();

  if (
    !clientId ||
    !clientSecret
  ) {
    throw new Error(
      "Google 환경변수가 설정되지 않았어요."
    );
  }

  const response =
    await fetch(
      "https://oauth2.googleapis.com/token",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded",
        },

        body:
          new URLSearchParams(
            {
              client_id:
                clientId,

              client_secret:
                clientSecret,

              refresh_token:
                token.refresh_token,

              grant_type:
                "refresh_token",
            }
          ),

        cache:
          "no-store",
      }
    );

  const refreshed =
    (await response.json()) as GoogleTokenResponse;

  if (
    !response.ok ||
    !refreshed.access_token
  ) {
    console.error(
      "Google access token refresh error:",
      refreshed
    );

    throw new Error(
      "Google Calendar 연결을 갱신하지 못했어요. 다시 연결해주세요."
    );
  }

  const newExpiryDate =
    Date.now() +
    (refreshed.expires_in ??
      3600) *
      1000;

  const {
    error:
      updateError,
  } = await supabase
    .from(
      "google_tokens"
    )
    .update({
      access_token:
        refreshed.access_token,

      expiry_date:
        newExpiryDate,

      updated_at:
        new Date().toISOString(),
    })
    .eq(
      "user_id",
      user.id
    );

  if (updateError) {
    console.error(
      "Google token update error:",
      updateError
    );
  }

  return refreshed.access_token;
}

// ============================================================
// 날짜 하루 더하기
// Google Calendar 종일 일정의 end.date는 exclusive
// 예: 9/5~9/7 일정 → end.date는 9/8
// ============================================================

function addOneDay(
  dateString: string
): string {
  const [
    year,
    month,
    day,
  ] = dateString
    .split("-")
    .map(Number);

  const date =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day
      )
    );

  date.setUTCDate(
    date.getUTCDate() + 1
  );

  return date
    .toISOString()
    .slice(0, 10);
}

// ============================================================
// Google Calendar 일정 생성
// ============================================================

export async function createGoogleCalendarEvent(
  booking: Booking
): Promise<string> {
  const slot =
    booking.available_slots;

  if (!slot) {
    throw new Error(
      "일정 정보가 없어요."
    );
  }

  const accessToken =
    await getGoogleAccessToken();

  const startDate =
    slot.date;

  const endDate =
    slot.end_date ??
    slot.date;

  if (!startDate) {
    throw new Error(
      "시작 날짜 정보가 없어요."
    );
  }

  if (
    endDate <
    startDate
  ) {
    throw new Error(
      "종료 날짜가 시작 날짜보다 빠를 수 없어요."
    );
  }

  /*
   * Google Calendar의 종일 일정은
   * end.date가 실제 마지막 날의 다음 날이어야 합니다.
   *
   * 당일:
   * 9/5 → start 9/5 / end 9/6
   *
   * 2박3일:
   * 9/5~9/7 → start 9/5 / end 9/8
   */

  const googleEndDate =
    addOneDay(
      endDate
    );

  const eventTitle =
    slot.title?.trim() ||
    `${booking.guest_name} · ${slot.meeting_type}`;

  const dateText =
    startDate === endDate
      ? startDate
      : `${startDate} ~ ${endDate}`;

  const description = [
    "캐치캐치보에서 확정된 약속입니다.",
    "",
    `예약자: ${booking.guest_name}`,
    `약속: ${booking.meeting_type}`,
    `날짜: ${dateText}`,
    `연락처: ${
      booking.guest_contact ??
      "없음"
    }`,
    `메모: ${
      booking.note ??
      "없음"
    }`,
    `예약 ID: ${booking.id}`,
  ].join("\n");

  const response =
    await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events",
      {
        method:
          "POST",

        headers: {
          Authorization:
            `Bearer ${accessToken}`,

          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify({
            summary:
              `🎯 ${eventTitle}`,

            description,

            location:
              slot.location_text,

            /*
             * 종일 일정
             * dateTime이 아니라 date 사용
             */
            start: {
              date:
                startDate,
            },

            end: {
              date:
                googleEndDate,
            },

            /*
             * 종일 일정은 시간 기반 알림 대신
             * 기본 알림을 사용.
             */
            reminders: {
              useDefault:
                true,
            },
          }),

        cache:
          "no-store",
      }
    );

  const event =
    (await response.json()) as GoogleCalendarEventResponse;

  if (
    !response.ok ||
    !event.id
  ) {
    console.error(
      "Google Calendar event creation error:",
      event
    );

    throw new Error(
      event.error?.message ||
        "Google Calendar 일정 생성에 실패했어요."
    );
  }

  return event.id;
}

// ============================================================
// Google Calendar 일정 삭제
// ============================================================

export async function deleteGoogleCalendarEvent(
  eventId: string
): Promise<void> {
  const accessToken =
    await getGoogleAccessToken();

  const response =
    await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(
        eventId
      )}`,
      {
        method:
          "DELETE",

        headers: {
          Authorization:
            `Bearer ${accessToken}`,
        },

        cache:
          "no-store",
      }
    );

  // 이미 캘린더에서 삭제된 경우도 성공 처리
  if (
    !response.ok &&
    response.status !==
      404
  ) {
    const errorText =
      await response.text();

    console.error(
      "Google Calendar event deletion error:",
      errorText
    );

    throw new Error(
      "Google Calendar 일정 삭제에 실패했어요."
    );
  }
}
