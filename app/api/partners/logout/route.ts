import { sessionCookieHeader } from "@/lib/partner-auth";

export async function POST() {
  return new Response(null, { status: 204, headers: { "set-cookie": sessionCookieHeader("", 0) } });
}
