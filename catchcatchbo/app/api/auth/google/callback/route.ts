import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  "https://catch-catchbo.vercel.app";

const REDIRECT_URI =
  `${SITE_URL}/api/auth/google/callback`;

type GoogleTokenResponse = {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
};

export async function GET(
  request: NextRequest
) {
  const code =
    request.nextUrl.searchParams.get("code");

  const googleError =
    request.nextUrl.searchParams.get("error");

  if (googleError) {
    console.error(
      "Google OAuth authorization error:",
      googleError
    );

    return NextResponse.redirect(
      `${SITE_URL}/admin?google=denied`
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${SITE_URL}/admin?google=missing_code`
    );
  }

  const clientId =
    process.env.GOOGLE_CLIENT_ID?.trim();

  const clientSecret =
    process.env.GOOGLE_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    console.error(
      "Google OAuth environment variables are missing."
    );

    return NextResponse.redirect(
      `${SITE_URL}/admin?google=config_error`
    );
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.redirect(
      `${SITE_URL}/login`
    );
  }

  try {
    const tokenResponse = await fetch(
      "https://oauth2.googleapis.com/token",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: REDIRECT_URI,
          grant_type:
            "authorization_code",
        }),
        cache: "no-store",
      }
    );

    const tokens =
      (await tokenResponse.json()) as GoogleTokenResponse;

    if (
      !tokenResponse.ok ||
      !tokens.access_token
    ) {
      console.error(
        "Google token exchange error:",
        tokens
      );

      return NextResponse.redirect(
        `${SITE_URL}/admin?google=token_error`
      );
    }

    const expiryDate =
      Date.now() +
      (tokens.expires_in ?? 3600) *
        1000;

    const {
      data: existingToken,
      error: selectError,
    } = await supabase
      .from("google_tokens")
      .select(
        "id, refresh_token"
      )
      .eq("user_id", user.id)
      .maybeSingle();

    if (selectError) {
      console.error(
        "Google token lookup error:",
        selectError
      );

      return NextResponse.redirect(
        `${SITE_URL}/admin?google=save_error`
      );
    }

    /*
     * Google이 재연결 시 refresh_token을
     * 항상 다시 보내지는 않으므로,
     * 새 값이 없으면 기존 값을 유지합니다.
     */
    const refreshToken =
      tokens.refresh_token ??
      existingToken?.refresh_token ??
      null;

    if (existingToken) {
      const { error: updateError } =
        await supabase
          .from("google_tokens")
          .update({
            access_token:
              tokens.access_token,
            refresh_token:
              refreshToken,
            expiry_date:
              expiryDate,
            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            existingToken.id
          );

      if (updateError) {
        console.error(
          "Google token update error:",
          updateError
        );

        return NextResponse.redirect(
          `${SITE_URL}/admin?google=save_error`
        );
      }
    } else {
      const { error: insertError } =
        await supabase
          .from("google_tokens")
          .insert({
            user_id: user.id,
            access_token:
              tokens.access_token,
            refresh_token:
              refreshToken,
            expiry_date:
              expiryDate,
          });

      if (insertError) {
        console.error(
          "Google token insert error:",
          insertError
        );

        return NextResponse.redirect(
          `${SITE_URL}/admin?google=save_error`
        );
      }
    }

    return NextResponse.redirect(
      `${SITE_URL}/admin?google=connected`
    );
  } catch (error) {
    console.error(
      "Google OAuth callback error:",
      error
    );

    return NextResponse.redirect(
      `${SITE_URL}/admin?google=unknown_error`
    );
  }
}
