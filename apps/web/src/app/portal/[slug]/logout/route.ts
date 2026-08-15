import { NextRequest, NextResponse } from 'next/server'
import { PORTAL_COOKIE } from '@/lib/portal-session'

export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  const response = NextResponse.redirect(new URL(`/portal/${params.slug}`, req.url))
  response.cookies.set(PORTAL_COOKIE, '', { path: '/portal', expires: new Date(0) })
  return response
}
