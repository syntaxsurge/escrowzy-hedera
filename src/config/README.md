# Config Directory

This directory contains all configuration files, constants, and environment
variable management. Configuration is centralized here to ensure consistency and
type safety across the application.

## Directory Structure and Naming Conventions

- All config files must use `.ts` extension
- File names should use kebab-case (e.g., `app-config.ts`)
- Configuration objects should be exported as const
- Use camelCase for config object properties
- Group related configurations in the same file

## Main Configuration Files

### `api-endpoints.ts`

API endpoint definitions and URL builders.

**Purpose**: Centralizes all API endpoints to avoid hardcoded URLs throughout
the codebase.

**When to extend**: Add new API endpoints or URL builder functions when creating
new API routes.

**Example extension**:

```typescript
// Instead of hardcoding URLs in components
// Add to api-endpoints.ts:
export const apiEndpoints = {
  ...existing,
  newFeature: {
    list: () => '/api/new-feature',
    detail: (id: string) => `/api/new-feature/${id}`
  }
}
```

### `app-config.ts`

Core application configuration and metadata.

**Purpose**: Stores application-wide settings like app name, description, and
URLs.

**When to extend**: Add new application-level configuration that needs to be
consistent across the app.

### `app-routes.ts`

Application route definitions and route builders.

**Purpose**: Centralizes all frontend routes to ensure consistent navigation and
avoid hardcoded paths.

**When to extend**: Add new pages or route builders when creating new frontend
routes.

**Pattern for route builders**:

```typescript
// For dynamic routes, create functions
teamMembers: (teamId: string) => `/dashboard/admin/teams/${teamId}/members`
```

### `blockchain-config-loader.ts`

Blockchain configuration loader and validator.

**Purpose**: Loads and validates blockchain configuration from YAML files.

**When to extend**: Modify blockchain loading logic or add new validation rules.

### `blockchain-config.generated.ts`

Auto-generated blockchain configuration types.

**Purpose**: Generated TypeScript types from blockchain YAML configuration.

**When to extend**: Do not manually edit - this is auto-generated.

### `env.public.ts`

Public environment variable validation and typing.

**Purpose**: Validates and types all NEXT*PUBLIC*\* environment variables using
Zod.

**When to extend**: Add new public environment variables with proper validation.

**Pattern**:

```typescript
NEXT_PUBLIC_NEW_VAR: z.string().optional().default('default-value')
```

### `env.server.ts`

Server-side environment variable validation and typing.

**Purpose**: Validates and types all server-side environment variables using
Zod.

**When to extend**: Add new server-side environment variables with proper
validation.

**Security**: Never expose server environment variables to the client.

### `wallet-provider.ts`

Wallet provider configuration and type definitions.

**Purpose**: Manages wallet provider selection and configuration.

**When to extend**: Add new wallet providers or provider-specific
configurations.

## Important Guidelines

### When to Extend vs Create New

**Extend existing config files when**:

- Adding related configuration to the same domain
- Adding new properties to existing config objects
- Creating variations of existing patterns
- The configuration logically belongs together

**How to extend**:

```typescript
// Extend existing config object
export const appConfig = {
  ...existing,
  newSection: {
    property: value
  }
}

// Add new route pattern
export const appRoutes = {
  ...existing,
  newFeature: {
    list: '/new-feature',
    detail: (id: string) => `/new-feature/${id}`
  }
}
```

**Create new config files when**:

- Introducing a completely new domain
- Configuration requires different imports
- File would exceed 150 lines
- Configuration has complex initialization logic

### Configuration Patterns

1. **Use const assertions** for type safety:

```typescript
export const config = {
  ...
} as const
```

2. **Create builder functions** for dynamic values:

```typescript
export const routes = {
  user: {
    profile: (id: string) => `/users/${id}/profile`
  }
}
```

3. **Validate environment variables** with Zod:

```typescript
const schema = z.object({
  MY_VAR: z.string().min(1)
})
```

4. **Group related configuration**:

```typescript
export const apiEndpoints = {
  auth: {
    login: '/api/auth/login',
    logout: '/api/auth/logout'
  },
  users: {
    list: '/api/users',
    detail: (id: string) => `/api/users/${id}`
  }
}
```

### Import Guidelines

- Import config from `@/config/[file]`
- Never import config into lib utilities
- Use specific imports rather than barrel exports
- Keep config dependencies minimal

### Environment Variable Guidelines

1. **Public variables** (accessible in browser):
   - Must start with `NEXT_PUBLIC_`
   - Define in `env.public.ts`
   - Safe to expose to users

2. **Server variables** (server-side only):
   - No prefix required
   - Define in `env.server.ts`
   - Never expose to client

3. **Validation pattern**:

```typescript
// Required variable
DATABASE_URL: z.string().url()

// Optional with default
PORT: z.string().optional().default('3000')

// Enum validation
NODE_ENV: z.enum(['development', 'production', 'test'])
```

### File Placement Decision Tree

1. Is it an API endpoint? → `api-endpoints.ts`
2. Is it a frontend route? → `app-routes.ts`
3. Is it an environment variable? → `env.public.ts` or `env.server.ts`
4. Is it app metadata? → `app-config.ts`
5. Is it blockchain related? → `blockchain-config-loader.ts`
6. Is it wallet related? → `wallet-provider.ts`
7. Is it a new domain? → Create new config file

### Configuration Best Practices

1. **Never hardcode** values that might change
2. **Validate early** - Use Zod schemas for validation
3. **Type everything** - Leverage TypeScript for safety
4. **Document complex config** with comments
5. **Keep secrets secure** - Use server-only files

### Testing Configuration

When adding configuration:

- Ensure all required env vars have defaults for development
- Test with missing optional variables
- Validate that types match runtime values
- Check that config loads correctly in all environments

### Common Patterns to Follow

1. **Route builders** for dynamic paths:

```typescript
detail: (id: string, tab?: string) =>
  tab ? `/items/${id}/${tab}` : `/items/${id}`
```

2. **Nested configuration** for organization:

```typescript
export const features = {
  payments: {
    enabled: true,
    providers: ['stripe', 'crypto']
  }
}
```

3. **Type-safe constants**:

```typescript
export const SUPPORTED_LOCALES = ['en', 'es', 'fr'] as const
export type Locale = (typeof SUPPORTED_LOCALES)[number]
```
