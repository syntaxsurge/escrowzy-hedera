export interface PaymentIntent {
  paymentId: string
  teamId: number
  userId: number
  amount: string
  amountWei: string
  currency: string
  networkId: number
  contractAddress: string
  planKey: number
  plan: {
    id: string
    name: string
    price: string
    currency: string
    features?: string[]
    maxMembers?: number
  }
  network: {
    id: number
    name: string
    nativeCurrency: string
  }
  pricing: {
    usdPrice: number
    cryptoPrice: number
    cryptoAmount: string
  }
}
