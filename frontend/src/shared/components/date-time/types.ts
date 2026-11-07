/** Date-only values use ISO calendar dates (yyyy-MM-dd), without timezone conversion. */
export type DateOnly = string
/** Local wall-clock date/time, formatted yyyy-MM-dd'T'HH:mm. */
export type LocalDateTime = string
export type DateRangeValue = { from?: DateOnly; to?: DateOnly }
export type DateTimeRangeValue = { from?: LocalDateTime; to?: LocalDateTime }
export type PickerProps<T> = {
  value?: T
  onChange: (value: T | undefined) => void
  disabled?: boolean
  required?: boolean
  readOnly?: boolean
  clearable?: boolean
  placeholder?: string
  minDate?: DateOnly
  maxDate?: DateOnly
  className?: string
  name?: string
  id?: string
  'aria-label'?: string
  'aria-invalid'?: boolean
  'aria-describedby'?: string
}
