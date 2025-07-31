// Authentication and Authorization Types

// User Roles
export type UserRole = 'user' | 'admin' | 'owner'

// Team Member Roles
export type TeamRole = 'member' | 'admin' | 'owner'

// Authentication Status
export type AuthStatus = 'authenticated' | 'unauthenticated' | 'loading'

// Session Data
export interface SessionData {
  userId: number
  email: string | null
  walletAddress: string | null
  name: string | null
  role: UserRole
  teamId?: number | null
  teamRole?: TeamRole | null
  expiresAt?: string
}

// Session
export interface Session {
  user: SessionData
  expires: string
  isExpired: boolean
}

// Auth Context
export interface AuthContextValue {
  session: Session | null
  status: AuthStatus
  isAuthenticated: boolean
  isAdmin: boolean
  isTeamOwner: boolean
  isTeamAdmin: boolean
  signIn: (credentials: SignInCredentials) => Promise<void>
  signOut: () => Promise<void>
  updateSession: (data: Partial<SessionData>) => void
}

// Sign In Credentials
export interface SignInCredentials {
  email?: string
  password?: string
  walletAddress?: string
  signature?: string
  message?: string
  nonce?: string
}

// Sign Up Data
export interface SignUpData {
  email?: string
  password?: string
  name?: string
  walletAddress?: string
  acceptTerms: boolean
}

// Auth Response
export interface AuthResponse {
  success: boolean
  session?: Session
  error?: string
  requiresVerification?: boolean
  redirectUrl?: string
}

// Token Payload
export interface TokenPayload {
  sub: string // user ID
  email?: string
  walletAddress?: string
  role: UserRole
  teamId?: number
  teamRole?: TeamRole
  iat: number
  exp: number
}

// Permission Check
export interface PermissionCheck {
  resource: string
  action: string
  context?: Record<string, any>
}

// Permission Result
export interface PermissionResult {
  allowed: boolean
  reason?: string
  requiredRole?: UserRole | TeamRole
}

// Team Authorization
export interface TeamAuthResult {
  authorized: boolean
  team?: {
    id: number
    name: string
    role: TeamRole
  }
  error?: string
}

// Detailed Team Access Result
export interface TeamAccessResult {
  team: any | null // Using any to avoid circular dependency with schema types
  membership: any | null
  isOwner: boolean
  isMember: boolean
}

// Auth Guards
export interface AuthGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  redirectTo?: string
  roles?: UserRole[]
  teamRoles?: TeamRole[]
  permissions?: string[]
}

// Protected Route Config
export interface ProtectedRouteConfig {
  path: string
  roles?: UserRole[]
  teamRoles?: TeamRole[]
  permissions?: string[]
  redirectTo?: string
}

// Auth Provider Props
export interface AuthProviderProps {
  children: React.ReactNode
  loadingComponent?: React.ReactNode
  unauthorizedComponent?: React.ReactNode
}

// Wallet Auth
export interface WalletAuthData {
  address: string
  chainId: number
  signature: string
  message: string
  nonce: string
}

// OAuth Provider
export type OAuthProvider = 'google' | 'github' | 'discord'

// OAuth Data
export interface OAuthData {
  provider: OAuthProvider
  accessToken: string
  refreshToken?: string
  profile: {
    id: string
    email?: string
    name?: string
    avatar?: string
  }
}

// Auth Error
export interface AuthError {
  code: string
  message: string
  statusCode?: number
  details?: Record<string, any>
}

// Common Auth Error Codes
export const AUTH_ERROR_CODES = {
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',
  ACCOUNT_DISABLED: 'ACCOUNT_DISABLED',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  WALLET_NOT_CONNECTED: 'WALLET_NOT_CONNECTED',
  INVALID_SIGNATURE: 'INVALID_SIGNATURE',
  NONCE_EXPIRED: 'NONCE_EXPIRED'
} as const

export type AuthErrorCode =
  (typeof AUTH_ERROR_CODES)[keyof typeof AUTH_ERROR_CODES]

// Type Guards
export function isAuthenticated(session: Session | null): session is Session {
  return session !== null && !session.isExpired
}

export function hasRole(session: Session | null, role: UserRole): boolean {
  return session?.user?.role === role
}

export function hasTeamRole(session: Session | null, role: TeamRole): boolean {
  return session?.user?.teamRole === role
}

export function canAccessAdmin(session: Session | null): boolean {
  return hasRole(session, 'admin')
}

export function canManageTeam(session: Session | null): boolean {
  return hasTeamRole(session, 'owner') || hasTeamRole(session, 'admin')
}
