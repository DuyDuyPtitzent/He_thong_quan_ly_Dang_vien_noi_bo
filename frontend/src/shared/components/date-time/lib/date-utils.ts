import { format, isValid, parse } from 'date-fns'

export function parseDateOnly(value?: string): Date | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined
  const parsed = parse(value, 'yyyy-MM-dd', new Date(2000, 0, 1))
  return isValid(parsed) && format(parsed, 'yyyy-MM-dd') === value ? parsed : undefined
}

export function toDateOnly(date?: Date): string | undefined {
  if (!date) return undefined
  return `${String(date.getFullYear()).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function formatDateOnly(value?: string): string {
  const date = parseDateOnly(value)
  return date ? format(date, 'dd/MM/yyyy') : ''
}

export function parseDirectDate(value: string): string | undefined {
  const date = parse(value, 'dd/MM/yyyy', new Date(2000, 0, 1))
  return isValid(date) && format(date, 'dd/MM/yyyy') === value ? format(date, 'yyyy-MM-dd') : undefined
}

export function parseDirectMonth(value: string): string | undefined {
  const date = parse(value, 'MM/yyyy', new Date(2000, 0, 1))
  return isValid(date) && format(date, 'MM/yyyy') === value ? format(date, 'yyyy-MM') : undefined
}

export function parseDirectDateTime(value: string): string | undefined {
  if (!/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/.test(value)) return undefined
  const date = parse(value, 'dd/MM/yyyy HH:mm', new Date(2000, 0, 1))
  return isValid(date) && format(date, 'dd/MM/yyyy HH:mm') === value ? `${format(date, 'yyyy-MM-dd')}T${format(date, 'HH:mm')}` : undefined
}

export function isWithinLimits(value: string, min?: string, max?: string) {
  return (!min || value >= min) && (!max || value <= max)
}

export function asLocalDateTime(date: Date, hour: number, minute: number) {
  return `${toDateOnly(date)}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

export function formatLocalDateTime(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return ''
  const date = parse(value, "yyyy-MM-dd'T'HH:mm", new Date(2000, 0, 1))
  return isValid(date) ? format(date, 'dd/MM/yyyy HH:mm') : ''
}
