# Components Directory

This directory contains all React components used throughout the application.
Components are organized into logical subdirectories based on their purpose and
reusability.

## Directory Structure and Naming Conventions

- All component files must use `.tsx` extension
- Component files should use kebab-case naming (e.g., `user-profile.tsx`)
- Component names should be PascalCase when exported (e.g., `UserProfile`)
- Each component should be in its own file
- Group related components in subdirectories

## Subdirectories

### `/ui`

**Purpose**: Base UI components that are highly reusable, unstyled or minimally
styled building blocks.

**What belongs here**:

- Primitive UI elements (buttons, inputs, modals, dropdowns)
- Components that wrap libraries like Radix UI with consistent styling
- Components that accept variants and are highly customizable
- Components with no business logic, only UI logic

**Examples of files that should go here**:

- Form controls (`input.tsx`, `select.tsx`, `checkbox.tsx`)
- Display elements (`badge.tsx`, `card.tsx`, `alert.tsx`)
- Interactive elements (`button.tsx`, `dialog.tsx`, `dropdown-menu.tsx`)

**When to add here**: If you're creating a new basic UI element that will be
used across multiple features and has no business logic.

### `/blocks`

**Purpose**: Composite components that combine UI components with specific
business logic or functionality.

**What belongs here**:

- Components that combine multiple UI components
- Components with specific business logic
- Feature-specific components that are still reusable
- Components that handle data fetching or state management

**Examples of files that should go here**:

- Data display components (`data-table.tsx`, `activity-list.tsx`)
- Interactive blocks (`notification-dropdown.tsx`, `pricing-button.tsx`)
- Modal components with business logic (`crypto-payment-modal.tsx`)

**Subdirectories within blocks**:

- `/blockchain`: Wallet and Web3-specific components
- `/health`: System health and monitoring components
- `/table`: Table-related components and utilities

**When to add here**: If you're creating a component that uses multiple UI
components or has business logic but is still reusable across features.

### `/layout`

**Purpose**: Components that define page structure and navigation.

**What belongs here**:

- Page layouts (`dashboard-layout.tsx`, `modern-layout.tsx`)
- Navigation components (`header.tsx`, `footer.tsx`, `admin-nav.tsx`)
- Breadcrumb and routing components (`auto-breadcrumb.tsx`)

**When to add here**: If you're creating a component that defines page structure
or navigation patterns.

### `/chat`

**Purpose**: Chat and messaging UI components.

**What belongs here**:

- Chat interface components (`chat-container.tsx`, `chat-input.tsx`)
- Message display components (`chat-message.tsx`, `chat-loading.tsx`)
- Chat layout components (`chat-layout-wrapper.tsx`, `mobile-chat-layout.tsx`)
- Chat utility components (`chat-search.tsx`, `chat-sidebar.tsx`,
  `team-members-list.tsx`)

**When to add here**: If you're creating components specifically for chat or
messaging features.

### `/providers`

**Purpose**: React Context providers and wrapper components that provide
functionality to child components.

**What belongs here**:

- Context providers (`theme-provider.tsx`, `wallet-provider.tsx`)
- Provider aggregators (`index.tsx` that combines multiple providers)
- Configuration providers
- Wallet providers (`thirdweb-provider.tsx`, `wagmi-provider.tsx`)

**When to add here**: If you're creating a component that uses React Context or
provides configuration/functionality to its children.

## Main Directory Files

### `client-only.tsx`

A wrapper component that ensures its children only render on the client side.
Use this to wrap components that use browser-only APIs or have SSR issues.

## Important Guidelines

### When to Extend vs Create New

**Extend existing components when**:

- The new functionality is a variation of existing behavior
- You need additional props or options
- The core purpose remains the same
- Example: Adding a new variant to `button.tsx` instead of creating
  `special-button.tsx`

**How to extend**:

- Add new props to the component interface
- Add new variants to variant definitions (if using CVA)
- Add conditional logic to handle new cases

**Create new components when**:

- The component serves a fundamentally different purpose
- The component would require completely different props
- Extending would make the original component too complex
- The components would share less than 50% of their code

### Component Patterns

1. **Always check for existing components** before creating new ones
2. **Use composition** - build complex components from simpler ones
3. **Keep components focused** - one component, one responsibility
4. **Make components configurable** - use props for variations instead of
   creating multiple similar components
5. **Use TypeScript interfaces** for all props
6. **Import utilities from centralized locations** - use `@/lib` for utilities

### Import Guidelines

- Always import UI components from their files in `/ui`
- Import utilities from `@/lib` or `@/lib/utils`
- Import types from `@/types`
- Use absolute imports with `@/` prefix
- Group imports: external libs, then internal components, then utils, then types

### Examples of Proper Component Extension

Instead of creating a new button component:

```typescript
// DON'T: Create new-special-button.tsx
export function NewSpecialButton() { ... }

// DO: Extend button.tsx with new variant
// In button.tsx, add to variants:
special: 'bg-special-color hover:bg-special-hover ...'
```

Instead of duplicating modal logic:

```typescript
// DON'T: Copy dialog.tsx to create custom-dialog.tsx
export function CustomDialog() { ... }

// DO: Use composition with existing dialog
export function CustomDialog({ ...props }) {
  return (
    <Dialog {...props}>
      <DialogContent className="custom-styles">
        {/* Custom content */}
      </DialogContent>
    </Dialog>
  )
}
```

### File Placement Decision Tree

1. Is it a basic UI element with no business logic? → `/ui`
2. Does it combine multiple components or have business logic? → `/blocks`
3. Is it Web3/blockchain specific? → `/blocks/blockchain`
4. Is it table-related? → `/blocks/table`
5. Does it define page structure? → `/layout`
6. Does it provide context or configuration? → `/providers`
7. Still unsure? → `/blocks` (default for feature components)
