# Context Directory

This directory contains React Context providers that manage global state and
provide shared functionality across the application. Contexts are used for state
that needs to be accessed by many components at different nesting levels.

## Directory Structure and Naming Conventions

- All context files must use `.tsx` extension
- Context files should use kebab-case naming (e.g., `blockchain.tsx`)
- Context names should use PascalCase with `Context` suffix (e.g.,
  `BlockchainContext`)
- Provider names should use PascalCase with `Provider` suffix (e.g.,
  `BlockchainProvider`)
- Hook names should start with `use` (e.g., `useBlockchain`)
- Export providers and hooks from `index.ts` for centralized imports

## Main Context Files

### `blockchain.tsx`

Unified blockchain context that abstracts wallet provider differences (Thirdweb
vs RainbowKit).

**Key features**:

- Wallet connection state and address
- Balance information
- Chain/network information
- Sign message functionality
- Transaction client access
- Chain switching capabilities
- Disconnect functionality

**Exported hooks**:

- `useBlockchain()` - Access blockchain context
- `useUnifiedChainInfo()` - Get chain configuration
- `useUnifiedWalletInfo()` - Get wallet state

**When to use**: When you need wallet information, blockchain interactions, or
chain data anywhere in the app.

**When to extend**: Add new blockchain-related state or functions that need
global access.

### `network.tsx`

Network context for managing blockchain network state and configuration.

**Key features**:

- Current network selection
- Network switching
- Network configuration
- Chain-specific settings

**Exported hooks**:

- `useNetwork()` - Access network context

**When to use**: When components need to know or change the current blockchain
network.

**When to extend**: Add network-specific configuration or state management.

### `index.ts`

Central export file for all context providers and hooks.

**Purpose**: Provides a single import point for context-related exports.

**Current exports**:

- `BlockchainProvider`, `useBlockchain`, `useUnifiedChainInfo`,
  `useUnifiedWalletInfo` from blockchain context
- `NetworkProvider`, `useNetwork` from network context

## Important Guidelines

### When to Create New Context vs Use Existing

**Create new context when**:

- Managing a distinct domain of global state
- Multiple unrelated components need the same data
- State needs to persist across route changes
- Prop drilling would require passing through 3+ levels

**Extend existing context when**:

- Adding related state to the same domain
- The new state is used alongside existing context data
- Components already use the context

### Context Patterns

1. **Always provide default values**:

```typescript
const MyContext = createContext<MyContextValue>({
  // Provide sensible defaults
  isLoading: false,
  data: null
  // ...
})
```

2. **Create custom hooks** for context consumption:

```typescript
export function useMyContext() {
  const context = useContext(MyContext)
  if (!context) {
    throw new Error('useMyContext must be used within MyProvider')
  }
  return context
}
```

3. **Separate concerns** - Don't put unrelated state in the same context:

```typescript
// Bad: Mixing unrelated state
const AppContext = { user, theme, notifications, blockchain }

// Good: Separate contexts
const AuthContext = { user }
const ThemeContext = { theme }
const BlockchainContext = { blockchain }
```

4. **Memoize context values** to prevent unnecessary re-renders:

```typescript
const value = useMemo(
  () => ({ state, setState, actions }),
  [state] // Only re-create when state changes
)
```

### Import Guidelines

- Import contexts from `@/context`
- Never import context files directly; use the index exports
- Import React hooks from 'react'
- Import types from `@/types`

### Performance Considerations

1. **Split contexts** by update frequency - Don't mix frequently changing state
   with stable state
2. **Use memo** for expensive computations in context
3. **Consider using zustand or similar** for complex state management needs
4. **Avoid putting everything in context** - Local state is often better

### File Placement Decision Tree

1. Is it wallet/blockchain related? → Extend `blockchain.tsx`
2. Is it network/chain configuration? → Extend `network.tsx`
3. Is it auth/user session related? → Consider services or hooks instead
4. Is it UI theme related? → Check providers folder first
5. Is it a new global domain? → Create new context file

### Testing Contexts

When creating contexts, ensure:

- Providers handle missing required props gracefully
- Hooks throw clear errors when used outside providers
- Context updates don't cause unnecessary re-renders
- Default values are reasonable for testing

### Security Considerations

1. **Don't store sensitive data** in context (private keys, secrets)
2. **Validate data** before storing in context
3. **Clear sensitive state** on logout/disconnect
4. **Use server-side state** for auth when possible

### Common Anti-patterns to Avoid

1. **Don't use context for local state** - If only one component uses it, keep
   it local
2. **Don't create deeply nested providers** - Combine related contexts when
   possible
3. **Don't put functions that could be utilities** in context
4. **Don't forget cleanup** in useEffect within providers
