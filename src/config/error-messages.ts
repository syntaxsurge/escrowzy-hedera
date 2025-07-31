// Centralized error messages for the application
export const errorMessages = {
  // Authentication errors
  auth: {
    invalidCredentials: 'Invalid credentials provided',
    sessionExpired: 'Your session has expired. Please sign in again',
    unauthorized: 'You are not authorized to perform this action',
    emailNotVerified: 'Please verify your email address to continue',
    walletNotConnected: 'Please connect your wallet to continue',
    signatureFailed: 'Signature verification failed',
    invalidToken: 'Invalid or expired token',
    accountSuspended: 'Your account has been suspended',
    tooManyAttempts: 'Too many attempts. Please try again later'
  },

  // Validation errors
  validation: {
    required: 'This field is required',
    invalidEmail: 'Please enter a valid email address',
    invalidAddress: 'Please enter a valid Ethereum address',
    amountTooLow: 'Amount is below the minimum allowed',
    amountTooHigh: 'Amount exceeds the maximum allowed',
    invalidFormat: 'Invalid format provided',
    lengthTooShort: 'Input is too short',
    lengthTooLong: 'Input is too long'
  },

  // Trade errors
  trade: {
    notFound: 'Trade not found',
    alreadyCompleted: 'This trade has already been completed',
    alreadyCancelled: 'This trade has already been cancelled',
    cannotCancel: 'This trade cannot be cancelled at this stage',
    depositFailed: 'Failed to process deposit',
    insufficientBalance: 'Insufficient balance to complete this trade',
    paymentTimeExpired: 'Payment time has expired',
    disputeAlreadyExists: 'A dispute already exists for this trade',
    unauthorizedAction:
      'You are not authorized to perform this action on this trade'
  },

  // Listing errors
  listing: {
    notFound: 'Listing not found',
    expired: 'This listing has expired',
    inactive: 'This listing is no longer active',
    cannotAcceptOwn: 'You cannot accept your own listing',
    insufficientAmount: 'Insufficient amount available',
    priceChanged: 'The listing price has changed'
  },

  // Battle errors
  battle: {
    dailyLimitReached: 'You have reached your daily battle limit',
    opponentNotFound: 'No opponent found. Please try again',
    alreadyInBattle: 'You are already in a battle',
    battleNotFound: 'Battle not found',
    battleTimeout: 'Battle timed out',
    invalidAction: 'Invalid battle action',
    notYourTurn: 'It is not your turn',
    battleEnded: 'This battle has already ended'
  },

  // Payment errors
  payment: {
    processingFailed: 'Payment processing failed',
    invalidAmount: 'Invalid payment amount',
    cardDeclined: 'Your card was declined',
    insufficientFunds: 'Insufficient funds',
    paymentMethodRequired: 'Payment method is required',
    subscriptionNotFound: 'Subscription not found',
    alreadySubscribed: 'You already have an active subscription'
  },

  // Team errors
  team: {
    notFound: 'Team not found',
    alreadyMember: 'User is already a member of this team',
    notMember: 'User is not a member of this team',
    cannotRemoveOwner: 'Cannot remove the team owner',
    maxMembersReached: 'Maximum team members limit reached',
    invitationExists: 'An invitation already exists for this user',
    invitationExpired: 'This invitation has expired'
  },

  // File upload errors
  upload: {
    fileTooLarge: 'File size exceeds the maximum allowed',
    invalidFileType: 'Invalid file type',
    uploadFailed: 'File upload failed',
    tooManyFiles: 'Too many files uploaded',
    fileNotFound: 'File not found'
  },

  // API errors
  api: {
    rateLimitExceeded: 'Rate limit exceeded. Please try again later',
    invalidApiKey: 'Invalid API key',
    apiKeyExpired: 'API key has expired',
    apiKeyRevoked: 'API key has been revoked',
    endpointNotFound: 'API endpoint not found',
    methodNotAllowed: 'Method not allowed',
    serverError: 'An unexpected server error occurred'
  },

  // Blockchain errors
  blockchain: {
    transactionFailed: 'Transaction failed',
    gasEstimationFailed: 'Failed to estimate gas',
    insufficientGas: 'Insufficient gas to complete transaction',
    networkError: 'Network error occurred',
    contractError: 'Smart contract execution failed',
    chainNotSupported: 'This blockchain is not supported',
    walletConnectionFailed: 'Failed to connect wallet'
  },

  // Database errors
  database: {
    connectionFailed: 'Failed to connect to database',
    queryFailed: 'Database query failed',
    transactionFailed: 'Database transaction failed',
    recordNotFound: 'Record not found',
    duplicateEntry: 'Duplicate entry exists',
    constraintViolation: 'Database constraint violation'
  },

  // General errors
  general: {
    somethingWentWrong: 'Something went wrong. Please try again',
    networkError: 'Network error. Please check your connection',
    maintenanceMode: 'System is under maintenance. Please try again later',
    featureDisabled: 'This feature is currently disabled',
    notImplemented: 'This feature is not yet implemented',
    invalidRequest: 'Invalid request',
    timeout: 'Request timed out'
  }
} as const

// Success messages
export const successMessages = {
  auth: {
    signInSuccess: 'Successfully signed in',
    signOutSuccess: 'Successfully signed out',
    emailVerified: 'Email verified successfully',
    passwordReset: 'Password reset successfully'
  },
  trade: {
    created: 'Trade created successfully',
    completed: 'Trade completed successfully',
    cancelled: 'Trade cancelled successfully',
    funded: 'Trade funded successfully',
    disputed: 'Dispute submitted successfully'
  },
  listing: {
    created: 'Listing created successfully',
    updated: 'Listing updated successfully',
    deleted: 'Listing deleted successfully',
    accepted: 'Listing accepted successfully'
  },
  battle: {
    victory: 'Congratulations! You won the battle',
    matchFound: 'Match found! Battle starting...',
    actionExecuted: 'Action executed successfully'
  },
  payment: {
    success: 'Payment processed successfully',
    subscriptionUpdated: 'Subscription updated successfully',
    subscriptionCancelled: 'Subscription cancelled successfully'
  },
  team: {
    memberAdded: 'Team member added successfully',
    memberRemoved: 'Team member removed successfully',
    invitationSent: 'Invitation sent successfully',
    roleUpdated: 'Role updated successfully'
  },
  general: {
    saved: 'Changes saved successfully',
    deleted: 'Deleted successfully',
    copied: 'Copied to clipboard',
    uploaded: 'File uploaded successfully'
  }
} as const

// Validation messages
export const validationMessages = {
  min: (field: string, value: number) => `${field} must be at least ${value}`,
  max: (field: string, value: number) => `${field} must be at most ${value}`,
  between: (field: string, min: number, max: number) =>
    `${field} must be between ${min} and ${max}`,
  pattern: (field: string) => `${field} format is invalid`,
  unique: (field: string) => `${field} already exists`,
  confirmed: (field: string) => `${field} confirmation does not match`
} as const
