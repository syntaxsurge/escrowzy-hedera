# Lib Directory

This directory contains all utility functions, helper modules, and core library
code. It serves as the central repository for reusable logic that doesn't belong
to components, hooks, or services.

## Directory Structure and Naming Conventions

- All files should use `.ts` extension (unless they contain JSX)
- File names should use kebab-case (e.g., `string-utils.ts`)
- Function names should use camelCase
- Group related utilities in subdirectories
- Export main utilities from `index.ts` for easy importing

## Main Directory Files

### `index.ts`

Central export file containing commonly used utilities across the application.

**Current utilities**:

- `cn()` - Class name utility for merging Tailwind classes
- `truncateAddress()` - Truncates blockchain addresses for display
- `formatDate()` - Formats dates consistently across the app

**When to add here**: Only add utilities that are used in 3+ different files
across the codebase.

## Subdirectories

### `/api`

**Purpose**: HTTP client utilities, API helpers, and data fetching utilities.

**What belongs here**:

- HTTP client configuration (`http-client.ts`)
- API endpoint builders
- Request/response interceptors
- API error handling utilities
- SWR configuration and helpers
- Rate limiting utilities
- API authentication helpers

**Files**:

- `http-client.ts` - Axios instance and request configuration
- `server-utils.ts` - Server-side API utilities
- `swr.ts` - SWR configuration and fetcher functions
- `coingecko.ts` - External API integrations

**When to add here**: Any utility that handles HTTP requests, API communication,
or data fetching.

### `/auth`

**Purpose**: Authentication and authorization utilities.

**What belongs here**:

- Session management utilities
- JWT token handling
- Permission checking functions
- User authentication helpers
- Team authorization logic
- Auth middleware utilities

**Files**:

- `auth-utils.ts` - Core authentication utilities
- `session.ts` - Session management functions
- `team-auth.ts` - Team-based authorization

**When to add here**: Any utility related to user authentication, authorization,
or session management.

### `/blockchain`

**Purpose**: Blockchain, Web3, and smart contract utilities.

**What belongs here**:

- Chain configuration and constants
- Smart contract ABIs and addresses
- Transaction utilities
- Wallet utilities
- Token utilities
- Gas estimation helpers
- Block explorer utilities

**Files**:

- `index.ts` - Chain configurations and constants
- `blockchain-transaction.ts` - Transaction handling utilities
- `payment.ts` - Crypto payment utilities
- `thirdweb-client.ts` - Thirdweb SDK configuration
- `transaction-messages.ts` - Transaction status messages

**When to add here**: Any utility related to blockchain interactions, Web3, or
smart contracts.

### `/db`

**Purpose**: Database utilities, queries, and schema definitions.

**What belongs here**:

- Database connection and client
- Schema definitions
- Query builders
- Migration files
- Seed data
- Database utilities

**Subdirectories**:

- `/migrations` - Database migration files
- `/queries` - Organized query functions by domain

**Files in `/queries`**:

- `query-builder.ts` - Base query building utilities
- `users.ts` - User-related queries
- `team-*.ts` - Team-related queries
- `admin-*.ts` - Admin-specific queries
- `payment-history.ts` - Payment query functions

**When to add here**: Database queries, schema changes, or database utilities.

### `/email`

**Purpose**: Email sending utilities and templates.

**What belongs here**:

- Email client configuration
- Email templates
- Email sending functions
- Email validation utilities
- Email queue handlers

**Files**:

- `index.ts` - Email client and core sending functions
- `invitation.ts` - Team invitation emails
- `verification.ts` - Email verification logic

**When to add here**: Any email-related functionality or templates.

### `/schemas`

**Purpose**: Zod validation schemas for forms and API validation.

**What belongs here**:

- Form validation schemas
- API request/response schemas
- Data validation utilities
- Type guards
- Schema composition utilities

**Files**:

- `validation.ts` - Base validation utilities
- `account.ts` - User account schemas
- `payment.ts` - Payment validation schemas
- `team.ts` - Team-related schemas
- `transaction.ts` - Transaction schemas

**When to add here**: Any Zod schema or validation logic.

### `/table`

**Purpose**: Table-related utilities and helpers.

**What belongs here**:

- Table configuration helpers
- Column definitions
- Sorting/filtering utilities
- Pagination helpers
- Bulk action utilities
- Table state management

**Files**:

- `table.ts` - Core table utilities
- `table-columns-config.ts` - Column configuration
- `bulk-actions.ts` - Bulk operation utilities

**When to add here**: Utilities specific to data tables and lists.

### `/utils`

**Purpose**: General-purpose utility functions organized by type.

**What belongs here**:

- String manipulation utilities
- Number formatting utilities
- Date utilities
- Array/Object utilities
- Type utilities
- Platform-specific utilities
- File handling utilities

**Files**:

- `avatar.ts` - Avatar generation and display utilities
- `file.ts` - File handling and validation utilities
- `ip.ts` - IP address utilities
- `notification.ts` - Notification formatting
- `string.ts` - String manipulation functions
- `subscription.ts` - Subscription utilities
- `upload.ts` - Server-side file upload utilities
- `upload-common.ts` - Shared upload utilities (client-safe)
- `user.ts` - User-related utilities

**When to add here**: General utilities that don't fit other categories.

## Important Guidelines

### When to Extend vs Create New

**Extend existing utilities when**:

- Adding optional parameters to support new use cases
- Adding related functionality to the same domain
- The utility serves the same general purpose
- Example: Adding new date format options to `formatDate()`

**How to extend**:

```typescript
// Instead of creating formatDateShort()
// Extend existing formatDate():
export function formatDate(
  date: string | Date,
  format: 'full' | 'short' | 'relative' = 'full'
): string {
  // Handle different formats
}
```

**Create new utilities when**:

- The function serves a different purpose
- It belongs in a different subdirectory
- It would make the existing function too complex
- It has different dependencies

### Import Guidelines

1. **From within lib**: Use relative imports
2. **From outside lib**: Use `@/lib` or `@/lib/subdirectory`
3. **Never import from components/hooks** into lib
4. **Types**: Import from `@/types`

### Utility Patterns

1. **Pure functions preferred** - No side effects when possible
2. **Type everything** - All parameters and returns
3. **Handle edge cases** - Null/undefined checks
4. **Document complex logic** - Use JSDoc comments
5. **Compose utilities** - Build complex from simple

### Examples of Proper Utility Extension

Instead of creating new string utilities:

```typescript
// DON'T: Create new file capitalize-first.ts
export function capitalizeFirst(str: string) { ... }

// DO: Add to existing string.ts
export function capitalize(
  str: string,
  type: 'first' | 'all' = 'first'
): string {
  if (type === 'all') return toTitleCase(str)
  return str.charAt(0).toUpperCase() + str.slice(1)
}
```

### File Placement Decision Tree

1. Is it API/HTTP related? → `/api`
2. Is it auth/permission related? → `/auth`
3. Is it blockchain/Web3 related? → `/blockchain`
4. Is it database related? → `/db`
5. Is it email related? → `/email`
6. Is it validation/schema related? → `/schemas`
7. Is it table specific? → `/table`
8. Is it a general utility? → `/utils`
9. Is it used everywhere? → Consider adding to `index.ts`

### Performance Considerations

1. **Memoize expensive operations** when used in React
2. **Avoid circular dependencies** between subdirectories
3. **Lazy load heavy utilities** when possible
4. **Cache external API calls** appropriately
5. **Use constants** for repeated values

### Testing Utilities

When creating utilities:

- Can it be unit tested easily?
- Are edge cases covered?
- Is it deterministic?
- Does it handle errors gracefully?
