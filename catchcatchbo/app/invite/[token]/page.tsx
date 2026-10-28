import { notFound } from "next/navigation";
import { readInvitation } from "@/lib/actions/invitations";
import InviteResponse from "./InviteResponse";
export const dynamic = "force-dynamic";
export const metadata = { title: "약속 초대", robots: { index: false, follow: false }, referrer: "no-referrer" as const };
export default async function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await readInvitation(token);
  if (!invite) notFound();
  return <InviteResponse invite={invite} token={token} />;
}
