import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname, searchParams } = req.nextUrl;

  // Allow Volnyn sessions through to dashboard (they use HMAC auth, not user auth)
  if (pathname.startsWith("/dashboard") && searchParams.get("volnyn_user_id")) {
    return NextResponse.next();
  }

  // Protect dashboard and generate routes
  if (
    (pathname.startsWith("/dashboard") || pathname.startsWith("/generate")) &&
    !req.auth
  ) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
