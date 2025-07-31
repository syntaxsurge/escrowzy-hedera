// Status constants for various entities across the application
export const statusConstants = {
  // Subscription plan IDs
  subscriptionPlans: {
    FREE: 'free',
    PRO: 'pro',
    TEAM: 'team',
    ENTERPRISE: 'enterprise'
  } as const,

  // Subscription status
  subscriptionStatus: {
    ACTIVE: 'active',
    EXPIRED: 'expired',
    CANCELLED: 'cancelled',
    PENDING: 'pending',
    TRIAL: 'trial',
    PAST_DUE: 'past_due'
  } as const,

  // Payment status
  paymentStatus: {
    PENDING: 'pending',
    PROCESSING: 'processing',
    SUCCEEDED: 'succeeded',
    FAILED: 'failed',
    CANCELLED: 'cancelled',
    REFUNDED: 'refunded'
  } as const,

  // API key status
  apiKeyStatus: {
    ACTIVE: 'active',
    REVOKED: 'revoked',
    EXPIRED: 'expired',
    SUSPENDED: 'suspended'
  } as const,

  // Session key status
  sessionKeyStatus: {
    ACTIVE: 'active',
    EXPIRED: 'expired',
    REVOKED: 'revoked'
  } as const,

  // User status
  userStatus: {
    ACTIVE: 'active',
    SUSPENDED: 'suspended',
    BANNED: 'banned',
    PENDING_VERIFICATION: 'pending_verification',
    DELETED: 'deleted'
  } as const,

  // Team member roles
  teamRoles: {
    OWNER: 'owner',
    ADMIN: 'admin',
    MEMBER: 'member'
  } as const,

  // Invitation status
  invitationStatus: {
    PENDING: 'pending',
    ACCEPTED: 'accepted',
    DECLINED: 'declined',
    EXPIRED: 'expired'
  } as const,

  // Queue task status
  queueTaskStatus: {
    PENDING: 'pending',
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    FAILED: 'failed',
    RETRYING: 'retrying'
  } as const,

  // Transaction status
  transactionStatus: {
    PENDING: 'pending',
    CONFIRMED: 'confirmed',
    FAILED: 'failed',
    DROPPED: 'dropped'
  } as const,

  // Dispute status
  disputeStatus: {
    OPEN: 'open',
    IN_REVIEW: 'in_review',
    RESOLVED: 'resolved',
    CLOSED: 'closed',
    ESCALATED: 'escalated'
  } as const,

  // Achievement status
  achievementStatus: {
    LOCKED: 'locked',
    UNLOCKED: 'unlocked',
    CLAIMED: 'claimed',
    MINTED: 'minted'
  } as const,

  // Quest status
  questStatus: {
    AVAILABLE: 'available',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    CLAIMED: 'claimed',
    EXPIRED: 'expired'
  } as const
} as const

// Type exports for each status category
export type SubscriptionPlanId =
  (typeof statusConstants.subscriptionPlans)[keyof typeof statusConstants.subscriptionPlans]
export type SubscriptionStatus =
  (typeof statusConstants.subscriptionStatus)[keyof typeof statusConstants.subscriptionStatus]
export type PaymentStatus =
  (typeof statusConstants.paymentStatus)[keyof typeof statusConstants.paymentStatus]
export type ApiKeyStatus =
  (typeof statusConstants.apiKeyStatus)[keyof typeof statusConstants.apiKeyStatus]
export type SessionKeyStatus =
  (typeof statusConstants.sessionKeyStatus)[keyof typeof statusConstants.sessionKeyStatus]
export type UserStatus =
  (typeof statusConstants.userStatus)[keyof typeof statusConstants.userStatus]
export type TeamRole =
  (typeof statusConstants.teamRoles)[keyof typeof statusConstants.teamRoles]
export type InvitationStatus =
  (typeof statusConstants.invitationStatus)[keyof typeof statusConstants.invitationStatus]
export type QueueTaskStatus =
  (typeof statusConstants.queueTaskStatus)[keyof typeof statusConstants.queueTaskStatus]
export type TransactionStatus =
  (typeof statusConstants.transactionStatus)[keyof typeof statusConstants.transactionStatus]
export type DisputeStatus =
  (typeof statusConstants.disputeStatus)[keyof typeof statusConstants.disputeStatus]
export type AchievementStatus =
  (typeof statusConstants.achievementStatus)[keyof typeof statusConstants.achievementStatus]
export type QuestStatus =
  (typeof statusConstants.questStatus)[keyof typeof statusConstants.questStatus]
