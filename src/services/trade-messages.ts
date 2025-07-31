import { listingConstants } from '@/config/business-constants'
import { sendMessageAction } from '@/lib/actions/chat'
import { buildTxUrl } from '@/lib/blockchain'
import { formatCurrency } from '@/lib/utils/string'
import type { TradeMetadata } from '@/types/trade'

export interface TradeMessageData {
  tradeId: number
  buyerId: number
  sellerId: number
  amount: string
  currency: string
  chainId?: number
  metadata?: TradeMetadata | null
}

/**
 * Send automatic system message when seller deposits crypto
 */
export async function sendDepositMessage(
  trade: TradeMessageData,
  transactionHash: string
) {
  try {
    const shortHash = `${transactionHash.slice(0, 8)}...${transactionHash.slice(-6)}`
    let blockchainUrl = ''

    if (trade.chainId) {
      blockchainUrl = buildTxUrl(trade.chainId, transactionHash)
    }

    const message = `🔒 **Crypto Deposited to Escrow**\n\nSeller has successfully deposited ${formatCurrency(
      trade.amount,
      trade.currency
    )} to the escrow contract.\n\nTransaction: \`${shortHash}\`${
      blockchainUrl ? `\n[View on Blockchain Explorer](${blockchainUrl})` : ''
    }\n\nBuyer can now proceed with fiat payment.`

    await sendMessageAction(
      'trade' as any,
      `trade_${trade.tradeId}`,
      message,
      undefined
    )
  } catch (error) {
    console.error('Failed to send deposit message:', error)
  }
}

/**
 * Send automatic message when buyer uploads payment proof
 */
export async function sendPaymentProofMessage(
  trade: TradeMessageData,
  imageUrls: string[]
) {
  try {
    const message = `💳 **Payment Sent**\n\nBuyer has marked the payment as sent and uploaded proof.\n\nAmount: ${formatCurrency(
      trade.amount,
      trade.currency
    )}\nPayment Method: ${trade.metadata?.paymentMethod || 'Bank Transfer'}\n\nSeller, please check your payment account and confirm once received.`

    const attachments = imageUrls.map((url, index) => ({
      name: `payment-proof-${index + 1}.jpg`,
      url,
      type: 'image/jpeg' as const,
      size: 0 // Size will be determined by the chat system
    }))

    await sendMessageAction(
      'trade' as any,
      `trade_${trade.tradeId}`,
      message,
      attachments
    )
  } catch (error) {
    console.error('Failed to send payment proof message:', error)
  }
}

/**
 * Send automatic message when seller confirms payment receipt
 */
export async function sendPaymentConfirmedMessage(
  trade: TradeMessageData,
  netAmount?: string
) {
  try {
    const feeAmount = trade.metadata?.escrowFeeAmount
    const message = `✅ **Payment Confirmed**\n\nSeller has confirmed receipt of the fiat payment.\n\nCrypto has been released from escrow to the buyer.\n\n${
      netAmount
        ? `Amount Released: ${formatCurrency(
            netAmount,
            trade.currency
          )} (after ${feeAmount} platform fee)`
        : ''
    }\n\n🎉 Trade completed successfully!`

    await sendMessageAction(
      'trade' as any,
      `trade_${trade.tradeId}`,
      message,
      undefined
    )
  } catch (error) {
    console.error('Failed to send payment confirmed message:', error)
  }
}

/**
 * Send reminder message about deposit deadline
 */
export async function sendDepositReminderMessage(
  trade: TradeMessageData,
  minutesRemaining: number
) {
  try {
    const message = `⏰ **Deposit Reminder**\n\nSeller has ${minutesRemaining} minutes remaining to deposit crypto to escrow.\n\nIf not deposited in time, the trade will be automatically cancelled.`

    await sendMessageAction(
      'trade' as any,
      `trade_${trade.tradeId}`,
      message,
      undefined
    )
  } catch (error) {
    console.error('Failed to send deposit reminder:', error)
  }
}

/**
 * Send message when trade is cancelled due to timeout
 */
export async function sendTimeoutMessage(trade: TradeMessageData) {
  try {
    const message = `❌ **Trade Cancelled**\n\nThe trade has been automatically cancelled due to deposit timeout.\n\nSeller did not deposit crypto within the ${listingConstants.DEFAULT_PAYMENT_WINDOW}-minute window.`

    await sendMessageAction(
      'trade' as any,
      `trade_${trade.tradeId}`,
      message,
      undefined
    )
  } catch (error) {
    console.error('Failed to send timeout message:', error)
  }
}

/**
 * Send message when dispute is raised
 */
export async function sendDisputeMessage(
  trade: TradeMessageData,
  reason: string,
  raisedBy: 'buyer' | 'seller'
) {
  try {
    const message = `⚠️ **Dispute Raised**\n\n${
      raisedBy === 'buyer' ? 'Buyer' : 'Seller'
    } has raised a dispute.\n\n**Reason:** ${reason}\n\nAll messages and evidence in this chat will be reviewed by our support team.\n\nPlease provide any additional information that may help resolve this dispute.`

    await sendMessageAction(
      'trade' as any,
      `trade_${trade.tradeId}`,
      message,
      undefined
    )
  } catch (error) {
    console.error('Failed to send dispute message:', error)
  }
}
