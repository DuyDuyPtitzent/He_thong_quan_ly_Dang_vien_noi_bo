import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useState } from 'react'
import { parseDateOnly, parseDirectDate, parseDirectDateTime, parseDirectMonth, formatDateOnly } from '@/shared/components/date-time/lib/date-utils'
import { RangeCalendar } from '@/shared/components/date-time/components/RangeCalendar'
import { DatePicker } from '@/shared/components/date-time/DatePicker'
import { MonthPicker } from '@/shared/components/date-time/MonthPicker'
import { YearPicker } from '@/shared/components/date-time/YearPicker'
import { DateTimePicker } from '@/shared/components/date-time/DateTimePicker'
import { DateTimeRangePicker } from '@/shared/components/date-time/DateTimeRangePicker'
import { DateRangePicker } from '@/shared/components/date-time/DateRangePicker'
import type { LocalDateTime } from '@/shared/components/date-time/types'

afterEach(cleanup)

function clickCalendarDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  const label = new Date(year, month - 1, day).toLocaleDateString()
  const button = screen.getAllByRole('button').find((item) => item.getAttribute('data-day') === label)
  if (!button) throw new Error(`Calendar day ${value} was not rendered`)
  fireEvent.click(button)
}

describe('date-time shared utilities', () => {
  it('keeps date-only values timezone independent and formats Vietnamese input', () => {
    expect(parseDateOnly('2024-02-29')).toBeDefined()
    expect(parseDateOnly('2023-02-29')).toBeUndefined()
    expect(parseDirectDate('29/02/2024')).toBe('2024-02-29')
    expect(parseDirectDate('31/04/2024')).toBeUndefined()
    expect(parseDirectMonth('11/2026')).toBe('2026-11')
    expect(parseDirectDateTime('05/11/2026 08:30')).toBe('2026-11-05T08:30')
    expect(parseDirectDateTime('31/11/2026 08:30')).toBeUndefined()
    expect(formatDateOnly('2026-11-05')).toBe('05/11/2026')
  })
})

describe('shared range calendar', () => {
  it('previews a continuous range on hover and freezes it after the end date is selected', () => {
    const onChange = vi.fn()
    const { rerender } = render(<RangeCalendar value={{ from: '2026-11-05' }} onChange={onChange} months={2} />)
    const hover = screen.getByRole('button', { name: /ngày 10 tháng 11 năm 2026/i })
    fireEvent.mouseMove(hover)
    expect(screen.getByRole('button', { name: /ngày 10 tháng 11 năm 2026/i })).toHaveAttribute('data-range-preview', 'end')
    fireEvent.click(screen.getByRole('button', { name: /ngày 10 tháng 11 năm 2026/i }))
    expect(onChange).toHaveBeenCalledWith({ from: '2026-11-05', to: '2026-11-10' })
    rerender(<RangeCalendar value={{ from: '2026-11-05', to: '2026-11-10' }} onChange={onChange} months={2} />)
    fireEvent.mouseEnter(screen.getByRole('button', { name: /ngày 5 tháng 11 năm 2026/i }))
    expect(screen.getByRole('button', { name: /ngày 10 tháng 11 năm 2026/i })).toHaveAttribute('data-range-preview', 'end')
  })

  it('selects a date-only range across the new year', () => {
    const onChange = vi.fn()
    render(<DateRangePicker value={{ from: '2026-12-30' }} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /30\/12\/2026/ }))
    clickCalendarDate('2027-01-02')
    expect(onChange).toHaveBeenCalledWith({ from: '2026-12-30', to: '2027-01-02' })
  })
})

describe('single-value pickers', () => {
  it('opens from the calendar icon and closes on an outside click', async () => {
    render(<DatePicker value={undefined} onChange={vi.fn()} />)
    const trigger = screen.getByRole('button', { name: 'dd/MM/yyyy' })
    await userEvent.click(trigger.querySelector('svg')!)
    expect(screen.getByText('Nhập ngày trực tiếp')).toBeInTheDocument()
    await userEvent.click(document.body)
    expect(screen.queryByText('Nhập ngày trực tiếp')).not.toBeInTheDocument()
  })

  it('selects a date from the Vietnamese calendar', () => {
    const onChange = vi.fn()
    render(<DatePicker value={undefined} onChange={onChange} minDate="2026-01-01" maxDate="2026-12-31" />)
    fireEvent.click(screen.getByRole('button', { name: 'dd/MM/yyyy' }))
    fireEvent.click(screen.getAllByRole('button', { name: /ngày 8 tháng 11 năm 2026/i }).at(-1)!)
    expect(onChange).toHaveBeenCalledWith('2026-11-08')
  })

  it('chooses a month and year without adding a day', () => {
    const onMonthChange = vi.fn(); const onYearChange = vi.fn()
    render(<><MonthPicker value="2026-01" onChange={onMonthChange} /><YearPicker value={2026} onChange={onYearChange} /></>)
    fireEvent.click(screen.getByRole('button', { name: '01/2026' }))
    fireEvent.click(screen.getByRole('button', { name: 'Tháng 2' }))
    expect(onMonthChange).toHaveBeenCalledWith('2026-02')
    fireEvent.click(screen.getByRole('button', { name: '2026' }))
    fireEvent.click(screen.getByRole('button', { name: '2027' }))
    expect(onYearChange).toHaveBeenCalledWith(2027)
  })

  it('accepts a valid direct date and exposes the invalid value without changing it', () => {
    const onChange = vi.fn()
    render(<DatePicker value={undefined} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'dd/MM/yyyy' }))
    fireEvent.change(screen.getByPlaceholderText('dd/MM/yyyy'), { target: { value: '29/02/2024' } })
    fireEvent.click(screen.getByRole('button', { name: 'Áp dụng' }))
    expect(onChange).toHaveBeenCalledWith('2024-02-29')
    fireEvent.click(screen.getByRole('button', { name: 'dd/MM/yyyy' }))
    fireEvent.change(screen.getByPlaceholderText('dd/MM/yyyy'), { target: { value: '31/04/2024' } })
    fireEvent.click(screen.getByRole('button', { name: 'Áp dụng' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Ngày không hợp lệ')
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('clears a selected optional date from the picker trigger', () => {
    const onChange = vi.fn()
    render(<DatePicker value="2026-11-08" onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'Xóa lựa chọn' }))
    expect(onChange).toHaveBeenCalledWith(undefined)
  })

  it('selects a local time with keyboard navigation', () => {
    function Harness() {
      const [value, setValue] = useState<LocalDateTime>()
      return <DateTimePicker value={value} onChange={setValue} name="thoiDiem" minDate="2026-11-01" maxDate="2026-11-30" />
    }
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'dd/MM/yyyy HH:mm' }))
    fireEvent.click(screen.getAllByRole('button', { name: /ngày 8 tháng 11 năm 2026/i }).at(-1)!)
    const hourList = screen.getByRole('listbox', { name: 'Thời gian: giờ' })
    fireEvent.click(hourList.querySelector('[aria-selected="true"]')!)
    fireEvent.keyDown(hourList.querySelector('[aria-selected="true"]')!, { key: 'ArrowDown' })
    expect(document.querySelector<HTMLInputElement>('input[name="thoiDiem"]')?.value).toBe('2026-11-08T09:00')
  })

  it('keeps all time values in bounded, independently scrollable columns', async () => {
    const onChange = vi.fn()
    render(<DateTimePicker value="2026-11-08T08:30" onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: /08\/11\/2026 08:30/ }))

    const hourList = screen.getByRole('listbox', { name: 'Thời gian: giờ' })
    const minuteList = screen.getByRole('listbox', { name: 'Thời gian: phút' })
    expect(screen.getByRole('region', { name: 'Thời gian' }).parentElement).toHaveClass('sm:items-start')
    expect(within(hourList).getAllByRole('option')).toHaveLength(24)
    expect(within(minuteList).getAllByRole('option')).toHaveLength(60)
    expect(hourList).toHaveClass('h-48', 'overscroll-contain')
    expect(minuteList).toHaveClass('max-h-[min(12rem,calc(100dvh-8rem))]')
    expect(document.querySelector('[data-slot="popover-content"]')).toHaveClass('max-h-[calc(100dvh-1rem)]')

    for (const minute of ['00', '15', '30', '45', '59']) {
      await userEvent.click(within(minuteList).getByRole('option', { name: minute }))
    }
    expect(onChange.mock.calls.map(([value]) => value)).toEqual([
      '2026-11-08T08:00',
      '2026-11-08T08:15',
      '2026-11-08T08:30',
      '2026-11-08T08:45',
      '2026-11-08T08:59',
    ])
  })

  it('keeps the saved time when the picker receives a different persisted value', () => {
    const onChange = vi.fn()
    const { rerender } = render(<DateTimePicker value="2026-11-08T08:00" onChange={onChange} />)
    rerender(<DateTimePicker value="2026-11-08T14:30" onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /08\/11\/2026 14:30/ }))
    clickCalendarDate('2026-11-09')
    expect(onChange).toHaveBeenCalledWith('2026-11-09T14:30')
  })
})

describe('date-time range picker', () => {
  it('keeps the two month calendars and confirms a valid date-time range', () => {
    const onChange = vi.fn()
    render(<DateTimeRangePicker value={{ from: '2026-11-04T08:00' }} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /04\/11\/2026 08:00/i }))
    const timeLists = screen.getAllByRole('listbox')
    expect(screen.getByRole('region', { name: 'Bắt đầu' }).parentElement?.parentElement).toHaveClass('xl:items-start')
    expect(timeLists).toHaveLength(4)
    expect(timeLists.map((list) => within(list).getAllByRole('option').length)).toEqual([24, 60, 24, 60])
    expect(timeLists.every((list) => list.classList.contains('overscroll-contain'))).toBe(true)
    fireEvent.click(screen.getAllByRole('button', { name: /ngày 5 tháng 11 năm 2026/i }).at(-1)!)
    const toHourList = screen.getByRole('listbox', { name: 'Kết thúc: giờ' })
    fireEvent.click(toHourList.querySelector('[aria-selected="true"]')!)
    fireEvent.keyDown(toHourList.querySelector('[aria-selected="true"]')!, { key: 'ArrowDown' })
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận' }))
    expect(onChange).toHaveBeenCalledWith({ from: '2026-11-04T08:00', to: '2026-11-05T09:00' })
  })

  it('selects date and time across December and January without UTC conversion', () => {
    const onChange = vi.fn()
    render(<DateTimeRangePicker value={{ from: '2026-12-31T23:00' }} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /31\/12\/2026 23:00/ }))
    clickCalendarDate('2027-01-01')
    fireEvent.click(within(screen.getByRole('listbox', { name: 'Kết thúc: giờ' })).getByRole('option', { name: '01' }))
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận' }))
    expect(onChange).toHaveBeenCalledWith({ from: '2026-12-31T23:00', to: '2027-01-01T01:00' })
  })
})
