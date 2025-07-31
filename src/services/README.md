# Services Directory

This directory contains server-side business logic and data access layers.
Services handle complex operations that involve multiple data sources, external
APIs, or require server-only execution.

## Directory Structure and Naming Conventions

- All service files must use `.ts` extension
- File names should use kebab-case (e.g., `user-subscription.ts`)
- Function names should use camelCase
- Services should import `'server-only'` at the top
- Group related services in subdirectories when needed

## Main Directory Services

### `user.ts`

Handles user-related operations including authentication state, profile
management, and user data access.

**Key functions**:

- `getUser()` - Retrieves authenticated user from session
- `getUserRole()` - Gets user role and permissions
- `updateUserProfile()` - Updates user information

**When to extend**: Add new user-related operations like preferences, settings,
or profile features.

### `payment.ts`

Manages payment processing, verification, and history tracking for blockchain
transactions.

**Key functions**:

- `createPaymentIntent()` - Generates payment intents for crypto payments
- `verifyPayment()` - Verifies blockchain transaction completion
- `getPaymentHistory()` - Retrieves user payment records

**When to extend**: Add new payment methods, verification logic, or
payment-related features.

### `subscription.ts`

Handles subscription management, plan validation, and subscription state.

**Key functions**:

- `getUserSubscription()` - Gets current subscription status
- `updateSubscription()` - Updates subscription after payment
- `validateSubscriptionAccess()` - Checks feature access

**When to extend**: Add new subscription tiers, features, or validation logic.

### `transaction.ts`

Manages blockchain transaction tracking and status updates.

**Key functions**:

- `createTransaction()` - Records new blockchain transactions
- `updateTransactionStatus()` - Updates transaction state
- `getTransactionHistory()` - Retrieves transaction records

**When to extend**: Add new transaction types or tracking features.

## Subdirectories

### `/blockchain`

**Purpose**: Blockchain-specific services that interact with smart contracts and
Web3 infrastructure.

**What belongs here**:

- Smart contract interaction services
- On-chain data validation services
- Blockchain event monitoring services
- Gas estimation services
- Multi-chain services

**Files**:

- `contract-plan.ts` - Smart contract plan management
- `contract-validation.ts` - On-chain validation logic

**When to add here**: Services that directly interact with blockchain or smart
contracts.

## Important Guidelines

### When to Extend vs Create New

**Extend existing services when**:

- Adding related functionality to the same domain
- The new function uses the same data sources
- It logically belongs with existing functions
- Example: Adding `getUserTeams()` to `user.ts`

**How to extend**:

```typescript
// Instead of creating user-teams.ts
// Add to existing user.ts:
export async function getUserTeams(userId: number) {
  // Query user's teams
}
```

**Create new services when**:

- Managing a different domain or entity
- Requiring different dependencies
- The file would become too large (>300 lines)
- Handling a distinct business process

### Service Patterns

1. **Always import 'server-only'** at the top
2. **Handle errors gracefully** - Return null or throw descriptive errors
3. **Use transactions** for multi-step operations
4. **Cache expensive operations** when appropriate
5. **Type all returns** - Never use `any`
6. **Validate inputs** - Don't trust client data

### Import Guidelines

- Import from `@/lib` for utilities
- Import from `@/lib/db` for database access
- Import from `@/types` for type definitions
- Import other services with relative paths
- Never import from components or hooks

### Database Access Patterns

Services should:

```typescript
// Good: Service handles database access
export async function getUser() {
  const user = await db.select().from(users).where(eq(users.id, userId))
  return user[0] || null
}

// Bad: Exposing raw database queries
export const userQuery = db.select().from(users)
```

### Error Handling

```typescript
// Good: Descriptive error handling
export async function verifyPayment(txHash: string) {
  if (!txHash) {
    throw new Error('Transaction hash is required')
  }

  try {
    // Verify payment
  } catch (error) {
    console.error('Payment verification failed:', error)
    throw new Error('Failed to verify payment')
  }
}
```

### Service Composition

Services can call other services:

```typescript
// Good: Composing services
export async function processPaymentAndUpdateSubscription(
  userId: number,
  txHash: string
) {
  // Use payment service
  const payment = await verifyPayment(txHash)

  // Use subscription service
  await updateSubscription(userId, payment.planId)

  return { payment, subscription }
}
```

### File Placement Decision Tree

1. Is it blockchain/smart contract specific? → `/blockchain`
2. Is it user authentication/profile related? → `user.ts`
3. Is it payment processing related? → `payment.ts`
4. Is it subscription management? → `subscription.ts`
5. Is it transaction tracking? → `transaction.ts`
6. Is it a new domain? → Create new service file

### Performance Considerations

1. **Use database joins** instead of multiple queries
2. **Implement caching** for frequently accessed data
3. **Use database transactions** for data consistency
4. **Batch operations** when possible
5. **Add indexes** for frequently queried fields

### Security Considerations

1. **Always validate user permissions**
2. **Sanitize inputs** before database queries
3. **Use parameterized queries** (Drizzle handles this)
4. **Don't expose internal IDs** in errors
5. **Log security-relevant events**

### Testing Services

When creating services, ensure:

- All edge cases are handled
- Database transactions are atomic
- External API failures are handled
- User permissions are validated
- Return types are consistent
