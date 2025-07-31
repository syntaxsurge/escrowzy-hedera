import { createThirdwebClient } from 'thirdweb'

import { envPublic } from '@/config/env.public'

export const thirdwebClient = createThirdwebClient({
  clientId: envPublic.NEXT_PUBLIC_THIRDWEB_CLIENT_ID
})
