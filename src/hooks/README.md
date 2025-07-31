# Hooks Directory

This directory contains all custom React hooks used throughout the application.
Hooks encapsulate reusable stateful logic and side effects.

## Directory Structure and Naming Conventions

- All hook files must use `.ts` or `.tsx` extension (`.tsx` only if returning
  JSX)
- Hook files should use kebab-case naming with `use-` prefix (e.g.,
  `use-dialog-state.ts`)
- Hook function names must start with `use` (e.g., `useDialogState`)
- Each hook should be in its own file
- Group related hooks in subdirectories

## Subdirectories

### `/blockchain`

**Purpose**: Hooks related to Web3, wallet connections, and blockchain
interactions.

**Current files**:

- `use-auto-switch-chain.ts` - Automatically switches to the correct blockchain
  network
- `use-transaction.ts` - Manages blockchain transaction state and execution
- `use-unified-wallet-auth.ts` - Unified wallet authentication across providers
  (Thirdweb/RainbowKit)
- `use-wallet-disconnect.ts` - Handles wallet disconnection logic

**What belongs here**:

- Wallet connection and authentication hooks
- Transaction management hooks
- Chain switching and network detection hooks
- Smart contract interaction hooks
- Web3 state management hooks

**When to add here**: If the hook interacts with wallets, blockchain networks,
or smart contracts.

## Main Directory Hooks

### `use-chat.ts`

Real-time chat functionality with Pusher integration. Manages message state,
websocket connections, and real-time updates.

**Key features**:

- Real-time message synchronization
- Connection state management
- Message handlers for new/update/delete events
- Support for both team and direct message contexts

**When to use**: When implementing real-time chat features.

**When to extend**: Add new message types or event handlers.

### `use-dialog-state.ts`

Manages dialog/modal state with data. Provides open/close functionality and
optional data passing.

**When to use**: When you need to control a modal/dialog with associated data.

**When to extend**: Add type parameters or additional state management features.

### `use-infinite-messages.ts`

Handles infinite scrolling and message pagination for chat interfaces.

**Key features**:

- Infinite scroll loading
- Message search functionality
- Optimistic updates for add/update/delete
- Message state management

**When to use**: When implementing chat or message list with pagination.

**When to extend**: Add new search filters or pagination strategies.

### `use-loading.tsx`

Manages loading states with optional loading components.

**When to use**: When you need to track loading states across async operations.

**When to extend**: Add new loading variants or additional state tracking.

### `use-server-table.ts`

Handles server-side table operations including pagination, sorting, and
filtering.

**When to use**: When implementing server-side data tables.

**When to extend**: Add new filter types or pagination strategies.

### `use-subscription-validation.ts`

Validates user subscriptions and plan access.

**When to use**: When checking if a user has access to specific features based
on their subscription.

**When to extend**: Add new validation rules or plan checks.

### `use-table-selection.ts`

Manages row selection state for tables.

**When to use**: When implementing tables with selectable rows.

**When to extend**: Add bulk selection features or selection persistence.

### `use-toast.ts`

Provides toast notification functionality.

**When to use**: When showing user notifications or alerts.

**When to extend**: Add new toast types or custom styling options.

## Important Guidelines

### When to Extend vs Create New

**Extend existing hooks when**:

- Adding parameters to support new use cases
- Adding return values for additional state
- The core functionality remains the same
- Example: Adding data validation to `use-dialog-state.ts`

**How to extend**:

```typescript
// Instead of creating use-dialog-with-validation.ts
// Extend use-dialog-state.ts:
export function useDialogState<T = any>(
  initialState = false,
  initialData: T | null = null,
  validator?: (data: T) => boolean // Add new parameter
) {
  // Add validation logic
}
```

**Create new hooks when**:

- The hook serves a fundamentally different purpose
- It would require completely different dependencies
- The hooks would share less than 40% of their logic
- Combining would violate single responsibility principle

### Hook Patterns

1. **Always prefix with `use`** - This is a React convention
2. **Return consistent interfaces** - Use objects for multiple return values
3. **Handle cleanup** - Use `useEffect` cleanup for subscriptions/timers
4. **Memoize expensive operations** - Use `useMemo` and `useCallback`
5. **Type everything** - All parameters and return types should be typed
6. **Document complex hooks** - Add JSDoc comments for complex logic

### Import Guidelines

- Import React hooks from 'react'
- Import other hooks from their relative paths
- Import utilities from `@/lib`
- Import types from `@/types`
- Use absolute imports with `@/` prefix

### Examples of Proper Hook Extension

Instead of creating a new dialog hook:

```typescript
// DON'T: Create use-confirm-dialog.ts
export function useConfirmDialog() { ... }

// DO: Extend use-dialog-state.ts or compose it
export function useConfirmDialog() {
  const dialog = useDialogState<{
    message: string;
    onConfirm: () => void
  }>()

  const confirm = useCallback((message: string, onConfirm: () => void) => {
    dialog.open({ message, onConfirm })
  }, [dialog])

  return { ...dialog, confirm }
}
```

### Common Hook Utilities to Import

- `@/lib/utils` - General utilities
- `@/lib/api` - API client utilities
- `@/types` - TypeScript type definitions
- `@/context` - Context providers and consumers

### File Placement Decision Tree

1. Is it blockchain/Web3 related? → `/blockchain`
2. Is it a general state management hook? → Main directory
3. Is it specific to a feature but reusable? → Main directory
4. Does it group related hooks? → Create a new subdirectory

### Hook Composition

Hooks can and should compose other hooks:

```typescript
// Good: Composing existing hooks
export function useAuthenticatedRequest() {
  const { user } = useAuth() // Use existing auth hook
  const toast = useToast() // Use existing toast hook

  const request = useCallback(
    async (url: string) => {
      if (!user) {
        toast.error('Please log in')
        return
      }
      // Make authenticated request
    },
    [user, toast]
  )

  return request
}
```

### Performance Considerations

1. **Use `useCallback`** for functions passed to child components
2. **Use `useMemo`** for expensive computations
3. **Avoid creating new objects/arrays** in render unless necessary
4. **Clean up effects** to prevent memory leaks
5. **Consider debouncing** for frequently changing values

### Testing Hooks

When creating hooks, consider:

- Can this hook be tested in isolation?
- Does it have side effects that need mocking?
- Are all edge cases handled?
- Is the cleanup logic tested?
