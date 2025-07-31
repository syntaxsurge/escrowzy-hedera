import { NextResponse } from 'next/server'

import { httpHeaders } from '@/config/api-endpoints'
import { envEdge } from '@/config/env.edge'

export function addSecurityHeaders(response: NextResponse) {
  // Security headers
  response.headers.set(httpHeaders.security.contentTypeOptions, 'nosniff')
  response.headers.set(httpHeaders.security.frameOptions, 'DENY')
  response.headers.set(httpHeaders.security.xssProtection, '1; mode=block')
  response.headers.set(
    httpHeaders.security.referrerPolicy,
    'strict-origin-when-cross-origin'
  )
  response.headers.set(
    httpHeaders.security.permissionsPolicy,
    'camera=(), microphone=(), geolocation=()'
  )

  // Add HSTS in production
  if (envEdge.isProduction) {
    response.headers.set(
      httpHeaders.security.strictTransportSecurity,
      'max-age=31536000; includeSubDomains'
    )
  }

  return response
}
