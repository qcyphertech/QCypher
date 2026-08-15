import { NextRequest, NextResponse } from 'next/server'
import { validateMagicLink } from '@/lib/actions/portal'
import { PORTAL_COOKIE } from '@/lib/portal-session'

// This was previously a page.tsx that called cookies().set() directly in a
// Server Component render — Next.js only allows cookie mutation inside a
// Server Action or Route Handler, so every magic-link sign-in was throwing
// a 500 in production ("Cookies can only be modified in a Server Action or
// Route Handler"). A Route Handler can set cookies on its NextResponse, so
// this moves the whole flow here instead.
export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  const token = req.nextUrl.searchParams.get('token')
  const loginUrl = new URL(`/portal/${params.slug}`, req.url)

  if (!token) {
    loginUrl.searchParams.set('auth_error', 'missing')
    return NextResponse.redirect(loginUrl)
  }

  const result = await validateMagicLink(token)

  if (!result.ok) {
    loginUrl.searchParams.set('auth_error', result.error)
    return NextResponse.redirect(loginUrl)
  }

  const response = NextResponse.redirect(new URL(`/portal/${params.slug}/dashboard`, req.url))
  response.cookies.set(PORTAL_COOKIE, result.sessionToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    expires: new Date(result.expiresAt),
    path: `/portal/${params.slug}`,
  })
  return response
}
