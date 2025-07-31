import PusherClient from 'pusher-js'

import { apiEndpoints } from '@/config/api-endpoints'
import { envPublic } from '@/config/env.public'

export const pusherClient =
  envPublic.NEXT_PUBLIC_PUSHER_KEY && envPublic.NEXT_PUBLIC_PUSHER_CLUSTER
    ? new PusherClient(envPublic.NEXT_PUBLIC_PUSHER_KEY, {
        cluster: envPublic.NEXT_PUBLIC_PUSHER_CLUSTER,
        authEndpoint: apiEndpoints.pusher.auth
      })
    : null
