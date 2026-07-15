import { NextResponse } from "next/server";

export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();

  if (!clientId) {
    return NextResponse.json(
      {
        error: "GOOGLE_CLIENT_ID가 비어 있어요.",
      },
      {
        status: 500,
      }
    );
  }

  const redirectUri =
    "https://catch-catchbo.vercel.app/api/auth/google/callback";

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    scope:
      "https://www.googleapis.com/auth/calendar.events",
  });

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  );
}
