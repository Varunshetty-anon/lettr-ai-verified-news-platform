import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(req: NextRequest) {
  // ✅ Allow cron jobs without auth
  if (req.nextUrl.pathname.startsWith("/api/cron")) {
    return NextResponse.next()
  }

  // We don't have other global auth logic here, 
  // as it is handled at the page/API level via `await auth()`.
  return NextResponse.next()
}

export const config = {
  matcher: ["/api/cron/:path*"],
}
