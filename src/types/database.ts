import type {
  User,
  Team,
  TeamMember,
  ActivityLog,
  TeamInvitation,
  PaymentHistory
} from '@/lib/db/schema'

// Extended database types with relations

export interface TeamMemberWithUser extends TeamMember {
  user: User
}

export interface ActivityLogWithUser extends ActivityLog {
  user: User | null
}

export interface TeamInvitationWithDetails
  extends Omit<TeamInvitation, 'invitedByUserId'> {
  team: {
    id: number
    name: string
  } | null
  invitedBy: {
    id: number
    name: string | null
    email: string | null
  } | null
  invitedByUserId: number
}

// User with relations
export interface UserWithTeam extends User {
  team?: Team | null
  teamMember?: TeamMember | null
}

export interface UserWithSubscription extends User {
  subscription?: any | null // Subscription table not yet defined in schema
}

export interface UserWithPlan {
  id: number
  email: string | null
  name: string | null
  role: string
  walletAddress: string | null
  createdAt: Date
  updatedAt: Date
  planId: string | null
  personalPlanId: string | null
  team?: {
    id: number
    name: string
    plan: string
  } | null
}

// Team with relations
export interface TeamWithMembers extends Team {
  members: TeamMemberWithUser[]
  memberCount?: number
}

export interface TeamWithOwner extends Team {
  owner: User
}

export interface TeamWithOwnerDetails {
  id: number
  name: string
  planId: string | null
  createdAt: Date
  updatedAt: Date
  memberCount: number
  ownerEmail: string | null
  ownerName: string | null
  ownerWallet: string | null
}

export interface TeamWithSubscription extends Team {
  subscription?: any | null // Subscription table not yet defined in schema
}

// Activity Log types
export interface ActivityLogDetails extends ActivityLog {
  user: User | null
  team?: Team | null
  targetUser?: User | null
}

// Payment types
export interface PaymentHistoryWithUser extends PaymentHistory {
  user: User
  team?: Team | null
}

export interface PaymentHistoryDetails extends PaymentHistory {
  user: {
    id: number
    name: string | null
    email: string | null
    walletAddress: string | null
  }
  team?: {
    id: number
    name: string
  } | null
}

// Transaction types (Transaction table not yet defined in schema)
export interface TransactionWithDetails {
  id: number
  user: User
  team?: Team | null
  payment?: PaymentHistory | null
  hash: string
  status: string
  createdAt: Date
  updatedAt: Date
}

// Notification types (Notification table not yet defined in schema)
export interface NotificationWithUser {
  id: number
  user: User
  title: string
  message: string
  type: string
  read: boolean
  createdAt: Date
}

// Subscription types (Subscription table not yet defined in schema)
export interface SubscriptionWithTeam {
  id: number
  team: Team
  planId: string
  status: string
  startDate: Date
  endDate?: Date | null
}

export interface SubscriptionDetails extends SubscriptionWithTeam {
  paymentHistory: PaymentHistory[]
  memberCount: number
}

// Invitation types
export interface TeamInvitationFull
  extends Omit<TeamInvitation, 'invitedByUserId'> {
  team: Team
  invitedBy: User
  invitedUser?: User | null
  invitedByUserId: number
}

// Query result types
export interface DatabaseStats {
  totalUsers: number
  totalTeams: number
  activeSubscriptions: number
  totalRevenue: number
  recentActivity: number
}

export interface TeamStats {
  memberCount: number
  invitationCount: number
  activityCount: number
  revenue: number
}

export interface UserStats {
  activityCount: number
  teamsCount: number
  paymentsCount: number
  lastActiveAt?: Date | string | null
}

// Table row types for admin panels
export interface UserTableRow extends UserWithPlan {
  teamName?: string | null
  lastActiveAt?: Date | string | null
  activityCount?: number
}

export interface TeamTableRow extends TeamWithOwner {
  memberCount: number
  revenue: number
  lastActivityAt?: Date | string | null
}

export interface PaymentTableRow extends PaymentHistoryDetails {
  userName: string | null
  userEmail: string | null
  teamName?: string | null
}

// Bulk operation types
export interface BulkUserUpdate {
  userIds: number[]
  updates: {
    role?: User['role']
    isActive?: boolean
  }
}

export interface BulkTeamUpdate {
  teamIds: number[]
  updates: {
    plan?: string
    isActive?: boolean
  }
}

// Filter types for queries
export interface UserFilter {
  role?: User['role']
  isActive?: boolean
  hasTeam?: boolean
  teamId?: number
  search?: string
}

export interface TeamFilter {
  plan?: string
  hasActiveSubscription?: boolean
  memberCountMin?: number
  memberCountMax?: number
  search?: string
}

export interface ActivityLogFilter {
  userId?: number
  teamId?: number
  activityType?: string
  dateFrom?: Date | string
  dateTo?: Date | string
}

export interface PaymentFilter {
  userId?: number
  teamId?: number
  status?: PaymentHistory['status']
  amountMin?: number
  amountMax?: number
  dateFrom?: Date | string
  dateTo?: Date | string
}
