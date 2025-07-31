// Form and Validation Types

// Form State Management
export interface FormState<T = any> {
  data: T
  errors: FormErrors
  isSubmitting: boolean
  isDirty: boolean
}

export type FormErrors = Record<string, string | string[]>

// Form Actions
export interface FormActions<T = any> {
  setField: (field: keyof T, value: any) => void
  setFields: (fields: Partial<T>) => void
  setError: (field: string, error: string) => void
  setErrors: (errors: FormErrors) => void
  clearError: (field: string) => void
  clearErrors: () => void
  reset: () => void
  submit: () => Promise<void>
}

// Validation Types
export interface ValidationRule {
  required?: boolean | string
  minLength?: number | { value: number; message: string }
  maxLength?: number | { value: number; message: string }
  pattern?: RegExp | { value: RegExp; message: string }
  validate?: (value: any) => boolean | string | Promise<boolean | string>
}

export type ValidationRules<T> = {
  [K in keyof T]?: ValidationRule
}

// Form Submission
export interface FormSubmitResult<T = any> {
  success: boolean
  data?: T
  errors?: FormErrors
  message?: string
}

// Field Types
export interface FormField<T = any> {
  name: string
  value: T
  error?: string
  touched: boolean
  pristine: boolean
}

// Form Context
export interface FormContextValue<T = any> {
  values: T
  errors: FormErrors
  touched: Record<keyof T, boolean>
  isSubmitting: boolean
  isValidating: boolean
  setFieldValue: (field: keyof T, value: any) => void
  setFieldError: (field: keyof T, error: string) => void
  setFieldTouched: (field: keyof T, touched: boolean) => void
  validateField: (field: keyof T) => Promise<void>
  validateForm: () => Promise<boolean>
  submitForm: () => Promise<void>
  resetForm: () => void
}

// Common Form Props
export interface FormProps<T = any> {
  initialValues: T
  onSubmit: (values: T) => void | Promise<void>
  validationRules?: ValidationRules<T>
  validateOnChange?: boolean
  validateOnBlur?: boolean
  enableReinitialize?: boolean
}

// Input Props
export interface FormInputProps<T = any> {
  name: keyof T
  label?: string
  placeholder?: string
  type?: string
  required?: boolean
  disabled?: boolean
  helperText?: string
  autoComplete?: string
}

// Select/Dropdown Props
export interface FormSelectProps<T = any> extends FormInputProps<T> {
  options: Array<{
    value: string | number
    label: string
    disabled?: boolean
  }>
  multiple?: boolean
}

// Checkbox/Radio Props
export interface FormCheckboxProps<T = any>
  extends Omit<FormInputProps<T>, 'placeholder'> {
  checked?: boolean
  indeterminate?: boolean
}

// File Upload Props
export interface FormFileProps<T = any> extends FormInputProps<T> {
  accept?: string
  multiple?: boolean
  maxSize?: number
  onFileSelect?: (files: FileList) => void
}

// Form Event Types
export type FormChangeEvent = React.ChangeEvent<
  HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
>
export type FormSubmitEvent = React.FormEvent<HTMLFormElement>
export type FormBlurEvent = React.FocusEvent<
  HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
>

// Validation Response
export interface ValidationResponse {
  isValid: boolean
  errors: FormErrors
}

// Field Registration
export interface RegisterFieldOptions {
  name: string
  rules?: ValidationRule
  defaultValue?: any
  transform?: (value: any) => any
}
