# Types Directory

This directory contains all TypeScript type definitions, interfaces, enums, and
type utilities used throughout the application. Types are organized by domain or
functionality.

## Directory Structure and Naming Conventions

- All type files must use `.ts` extension
- File names should use kebab-case (e.g., `user-profile.ts`)
- Type/Interface names should use PascalCase
- Enum names should use PascalCase
- Type guards should use `is` prefix (e.g., `isAuthenticated`)
- Group related types in the same file

## Main Type Files

### `activity-log.ts`

Activity tracking and audit log types.

**Key types**:

- `ActivityLog` - Base activity log structure
- `ActivityType` - Activity type enum
- `ActivityData` - Activity-specific data payloads

**When to extend**: Add new activity types or activity-specific data structures.

### `api.ts`

API request/response types and contracts.

**Key types**:

- `ApiResponse<T>` - Standard API response wrapper
- `ApiError` - API error structure
- `PaginatedResponse<T>` - Paginated data response
- `QueryParams` - Common query parameters

**When to extend**: Add new API endpoints or response formats.

### `auth.ts`

Authentication and authorization types.

**Key types**:

- `SessionData` - User session information
- `UserRole` - User role enum
- `TeamRole` - Team member role enum
- `AuthResponse` - Authentication response
- Type guards: `isAuthenticated()`, `hasRole()`, `hasTeamRole()`

**When to extend**: Add new roles, permissions, or auth methods.

### `blockchain.ts`

Web3 and blockchain-related types.

**Key types**:

- `ChainConfig` - Blockchain network configuration
- `WalletInfo` - Wallet connection state
- `TransactionState` - Transaction lifecycle states
- `ContractConfig` - Smart contract configurations

**When to extend**: Add new chains, contract types, or Web3 features.

### `common.ts`

Common utility types used across the application.

**Key types**:

- `ID` - Generic ID type
- `Nullable<T>`, `Optional<T>`, `Maybe<T>` - Null handling
- `DeepPartial<T>` - Recursive partial
- `Result<T, E>` - Error handling pattern
- `Page<T>` - Pagination structure
- Type guards: `isDefined()`, `isString()`, `isNumber()`

**When to extend**: Add new utility types or type guards.

### `database.ts`

Database schema types (typically generated from Drizzle).

**Key types**:

- Table row types
- Insert/Update types
- Relation types

**When to extend**: Usually auto-generated; manual additions should be minimal.

### `forms.ts`

Form validation and input types.

**Key types**:

- Form data structures
- Validation rule types
- Form state types
- Input component props

**When to extend**: Add new form types or validation patterns.

### `notification.ts`

Notification and alert types.

**Key types**:

- `Notification` - Notification structure
- `NotificationType` - Notification variants
- `NotificationPreferences` - User preferences

**When to extend**: Add new notification types or channels.

### `payment.ts`

Payment and billing types.

**Key types**:

- `PaymentIntent` - Payment initialization
- `PaymentStatus` - Payment states
- `PricingPlan` - Subscription plans
- `PaymentMethod` - Payment method types

**When to extend**: Add new payment methods or plan structures.

### `table.ts`

Data table and list types.

**Key types**:

- `TableColumn<T>` - Column definitions
- `TableState` - Table UI state
- `SortConfig` - Sorting configuration
- `FilterConfig` - Filter configuration

**When to extend**: Add new table features or column types.

### `transaction.ts`

Blockchain transaction types.

**Key types**:

- `Transaction` - Transaction record
- `TransactionStatus` - Transaction states
- `TransactionType` - Transaction categories
- `GasConfig` - Gas settings

**When to extend**: Add new transaction types or status flows.

### `ui.ts`

UI component prop types and states.

**Key types**:

- Component prop interfaces
- UI state types
- Theme types
- Layout configurations

**When to extend**: Add new UI patterns or component variants.

## Important Guidelines

### When to Extend vs Create New

**Extend existing types when**:

- Adding optional properties to interfaces
- Creating specialized versions of existing types
- Adding new enum values
- Adding related type guards

**How to extend**:

```typescript
// Extend interface
interface ExtendedUser extends User {
  preferences?: UserPreferences
}

// Extend enum (create new related enum)
enum ExtendedActivityType {
  ...ActivityType,
  CUSTOM_ACTION = 'custom_action'
}

// Add to existing file
export interface UserPreferences {
  theme: 'light' | 'dark'
  notifications: boolean
}
```

**Create new type files when**:

- Introducing a new domain or feature area
- Types are not related to existing files
- File would exceed 200 lines
- Types require different imports

### Type Patterns

1. **Use discriminated unions** for variants:

```typescript
type Result = { status: 'success'; data: T } | { status: 'error'; error: Error }
```

2. **Export type guards** with types:

```typescript
export interface User { ... }
export function isUser(value: unknown): value is User { ... }
```

3. **Use generics** for reusable types:

```typescript
export interface ApiResponse<T> {
  data: T
  error?: string
}
```

4. **Document complex types** with JSDoc:

```typescript
/**
 * Represents a paginated response from the API
 * @template T - The type of items in the page
 */
export interface Page<T> { ... }
```

### Import Guidelines

- Import from `@/types/[file]` for specific types
- Never import from implementation files
- Group imports by file
- Use `type` imports when possible:

```typescript
import type { User, Team } from '@/types/database'
```

### Type vs Interface

**Use `interface` when**:

- Defining object shapes
- Types might be extended
- Defining class contracts

**Use `type` when**:

- Creating union types
- Creating aliases
- Using mapped types
- Defining function types

### File Placement Decision Tree

1. Is it auth/session related? → `auth.ts`
2. Is it blockchain/Web3 related? → `blockchain.ts`
3. Is it a utility type? → `common.ts`
4. Is it API contract related? → `api.ts`
5. Is it form/input related? → `forms.ts`
6. Is it payment/billing related? → `payment.ts`
7. Is it table/list related? → `table.ts`
8. Is it UI component related? → `ui.ts`
9. Is it a new domain? → Create new file

### Type Safety Best Practices

1. **Avoid `any`** - Use `unknown` and type guards
2. **Use const assertions** for literal types:

```typescript
export const ROLES = ['user', 'admin', 'owner'] as const
export type Role = (typeof ROLES)[number]
```

3. **Make invalid states unrepresentable**:

```typescript
// Bad
interface User {
  isLoading: boolean
  error?: Error
  data?: UserData
}

// Good
type UserState =
  | { status: 'loading' }
  | { status: 'error'; error: Error }
  | { status: 'success'; data: UserData }
```

4. **Use branded types** for validation:

```typescript
type EmailAddress = Brand<string, 'EmailAddress'>
```

### Common Type Utilities

The `common.ts` file provides utilities you should use:

- `Nullable<T>` - For nullable values
- `DeepPartial<T>` - For nested partial objects
- `Result<T, E>` - For error handling
- Type guards - For runtime type checking
