import { NextResponse } from 'next/server'

/**
 * Generic error response cho public endpoints: không leak schema/details
 * Log chi tiết server-side để debug.
 */
export function publicError(
  status: number,
  userMessage: string,
  internalError?: unknown
): NextResponse {
  if (internalError) {
    console.error(`[publicError ${status}] ${userMessage}:`, internalError)
  }
  return NextResponse.json({ error: userMessage }, { status })
}

export function rateLimitResponse(retryAfterSec: number): NextResponse {
  return NextResponse.json(
    { error: 'Quá nhiều yêu cầu. Vui lòng thử lại sau.' },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfterSec),
      },
    }
  )
}
