'use server'

import { getUser } from '@/services/user'

export async function getCurrentUserAction() {
  return await getUser()
}
