export type TransactionStatus =
  | 'pending'
  | 'processing'
  | 'confirmed'
  | 'failed'

export interface TransactionStatusUpdate {
  hash: string
  chainId: number
  status: TransactionStatus
  message: string
  description?: string
}
