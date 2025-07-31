// Common/Utility Types used across the application

// ID Types
export type ID = string | number

// Nullable Type
export type Nullable<T> = T | null
export type Optional<T> = T | undefined
export type Maybe<T> = T | null | undefined

// Object Types
export type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>
    }
  : T

export type ReadOnly<T> = {
  readonly [P in keyof T]: T[P]
}

export type Mutable<T> = {
  -readonly [P in keyof T]: T[P]
}

// Array Types
export type NonEmptyArray<T> = [T, ...T[]]

// Function Types
export type AsyncFunction<T = void> = () => Promise<T>
export type VoidFunction = () => void
export type Callback<T = void> = (error: Error | null, result?: T) => void

// Date/Time Types
export type ISODateString = string
export type Timestamp = number

export interface DateRange {
  start: Date | string
  end: Date | string
}

// Status Types
export type Status = 'idle' | 'loading' | 'success' | 'error'

export interface StatusWithData<T = any> {
  status: Status
  data?: T
  error?: Error | string
}

// Result Types (for error handling)
export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E }

// Pagination Types (simplified)
export interface Page<T> {
  items: T[]
  pageNumber: number
  pageSize: number
  totalItems: number
  totalPages: number
  hasNext: boolean
  hasPrevious: boolean
}

// Key-Value Types
export type KeyValuePair<K = string, V = any> = {
  key: K
  value: V
}

export type Dictionary<T = any> = Record<string, T>

// Metadata Types
export interface WithMetadata {
  metadata?: Record<string, any>
}

export interface WithTimestamps {
  createdAt: Date | string
  updatedAt: Date | string
}

export interface WithSoftDelete extends WithTimestamps {
  deletedAt?: Date | string | null
}

// Entity Types
export interface BaseEntity extends WithTimestamps {
  id: ID
}

export interface NamedEntity extends BaseEntity {
  name: string
  description?: string
}

// Image/Media Types
export interface Image {
  url: string
  alt?: string
  width?: number
  height?: number
}

export interface File {
  name: string
  size: number
  type: string
  url?: string
  lastModified?: number
}

// Location Types
export interface Coordinates {
  latitude: number
  longitude: number
}

export interface Address {
  street?: string
  city?: string
  state?: string
  country?: string
  postalCode?: string
}

// Contact Types
export interface ContactInfo {
  email?: string
  phone?: string
  website?: string
}

// Money/Currency Types
export interface Money {
  amount: number
  currency: string
  formatted?: string
}

// Percentage Type
export type Percentage = number // 0-100

// Environment Types
export type Environment = 'development' | 'staging' | 'production' | 'test'

// HTTP Types
export type HttpMethod =
  | 'GET'
  | 'POST'
  | 'PUT'
  | 'DELETE'
  | 'PATCH'
  | 'HEAD'
  | 'OPTIONS'

export interface HttpHeaders {
  [key: string]: string
}

// Sort Direction
export type SortDirection = 'asc' | 'desc'

// Generic CRUD Operations
export interface CrudOperations<T, CreateInput, UpdateInput> {
  create: (data: CreateInput) => Promise<T>
  read: (id: ID) => Promise<T | null>
  update: (id: ID, data: UpdateInput) => Promise<T>
  delete: (id: ID) => Promise<boolean>
  list: (params?: any) => Promise<T[]>
}

// Action Types
export interface Action<T = any> {
  type: string
  payload?: T
  meta?: any
  error?: boolean
}

// Feature Flags
export interface FeatureFlag {
  name: string
  enabled: boolean
  description?: string
  enabledFor?: string[] // user IDs, roles, etc.
}

// Settings/Configuration
export interface Setting {
  key: string
  value: any
  type: 'string' | 'number' | 'boolean' | 'json'
  description?: string
  category?: string
}

// Audit Types
export interface AuditLog {
  id: ID
  userId: ID
  action: string
  resource: string
  resourceId?: ID
  changes?: Record<string, { before: any; after: any }>
  metadata?: Record<string, any>
  timestamp: Date | string
  ipAddress?: string
  userAgent?: string
}

// Type Helpers
export type ValueOf<T> = T[keyof T]
export type KeysOf<T> = keyof T
export type Entries<T> = [keyof T, ValueOf<T>][]

// Branded Types (for type safety)
export type Brand<K, T> = K & { __brand: T }
export type EmailAddress = Brand<string, 'EmailAddress'>
export type URL = Brand<string, 'URL'>
export type UUID = Brand<string, 'UUID'>

// Utility Functions for Type Guards
export function isNotNull<T>(value: T | null): value is T {
  return value !== null
}

export function isNotUndefined<T>(value: T | undefined): value is T {
  return value !== undefined
}

export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined
}

export function isString(value: unknown): value is string {
  return typeof value === 'string'
}

export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value)
}

export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean'
}

export function isObject(value: unknown): value is object {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function isArray<T = any>(value: unknown): value is T[] {
  return Array.isArray(value)
}

export function isFunction(value: unknown): value is Function {
  return typeof value === 'function'
}
