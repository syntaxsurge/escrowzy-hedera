import 'server-only'

import { headers } from 'next/headers'

import requestIp from 'request-ip'

export async function getIpAddress(): Promise<string> {
  const headersList = await headers()
  const request = {
    headers: {
      'x-forwarded-for': headersList.get('x-forwarded-for'),
      'x-real-ip': headersList.get('x-real-ip'),
      'x-client-ip': headersList.get('x-client-ip'),
      'x-forwarded': headersList.get('x-forwarded'),
      'x-cluster-client-ip': headersList.get('x-cluster-client-ip'),
      'forwarded-for': headersList.get('forwarded-for'),
      forwarded: headersList.get('forwarded'),
      'cf-connecting-ip': headersList.get('cf-connecting-ip')
    }
  }

  return requestIp.getClientIp(request as any) || 'unknown'
}
