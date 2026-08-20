import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isSuperAdminUser } from '@/lib/auth/superadmin'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Public routes — no auth required
  if (
    pathname.startsWith('/auth') ||
    pathname === '/' ||
    pathname === '/about' ||
    pathname === '/security' ||
    pathname === '/privacy' ||
    pathname === '/terms' ||
    pathname === '/faq' ||
    pathname.startsWith('/blog') ||
    pathname.startsWith('/api/blog/latest') ||
    pathname.startsWith('/api/bot/') ||
    pathname.startsWith('/api/cron/') ||
    pathname.startsWith('/api/security/') ||
    pathname.startsWith('/api/telnyx/') ||
    pathname.startsWith('/api/portal/') ||
    pathname === '/paymentcallback' ||
    pathname === '/api/webhooks/helcim-connected-account' ||
    pathname === '/api/webhooks/stripe-connect' ||
    pathname.startsWith('/api/contact') ||
    pathname.startsWith('/q/') ||
    pathname.startsWith('/portal/') ||
    pathname.startsWith('/invoice/') ||
    pathname.startsWith('/pay/') ||
    pathname.startsWith('/recurring/')
  ) {
    return supabaseResponse
  }

  // Unauthenticated → login
  if (!user) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  // Super admins can read every tenant's data, so MFA is mandatory for
  // this account tier specifically (not tenant users — see
  // docs/risk-register.md Risk #3). Checked via session AAL, which
  // covers every sign-in method (password, Google OAuth, magic link)
  // since it's a property of the session, not the login path taken.
  //
  // TEMPORARILY DISABLED 2026-08-20 at explicit user request — re-enable
  // by uncommenting this block. Does not affect any already-enrolled MFA
  // factor; it only stops forcing setup/challenge on every request.
  // if (isSuperAdminUser(user)) {
  //   const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  //   if (aal && aal.nextLevel === 'aal2' && aal.currentLevel !== 'aal2') {
  //     return NextResponse.redirect(new URL(`/auth/mfa-challenge?next=${encodeURIComponent(pathname)}`, request.url))
  //   }
  //   if (aal && aal.nextLevel !== 'aal2') {
  //     return NextResponse.redirect(new URL(`/auth/mfa-setup?next=${encodeURIComponent(pathname)}`, request.url))
  //   }
  // }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
