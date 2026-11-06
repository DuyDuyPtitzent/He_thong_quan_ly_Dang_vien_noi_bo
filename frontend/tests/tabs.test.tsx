import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'

function setTabGeometry(tab: HTMLElement, left: number, width: number) {
  Object.defineProperties(tab, {
    offsetLeft: { configurable: true, get: () => left },
    offsetWidth: { configurable: true, get: () => width },
    getClientRects: { configurable: true, value: () => [{ width, height: 32 }] },
  })
}

describe('shared Tabs indicator', () => {
  afterEach(() => cleanup())

  it('slides to the selected trigger with its measured width for pointer and keyboard changes', async () => {
    render(<Tabs defaultValue="summary"><TabsList variant="line" className="overflow-x-auto"><TabsTrigger value="summary">Tổng quan</TabsTrigger><TabsTrigger value="history">Lịch sử dài hơn</TabsTrigger></TabsList><TabsContent value="summary">Nội dung</TabsContent><TabsContent value="history">Lịch sử</TabsContent></Tabs>)

    const list = screen.getByRole('tablist')
    const summary = screen.getByRole('tab', { name: 'Tổng quan' })
    const history = screen.getByRole('tab', { name: 'Lịch sử dài hơn' })
    const indicator = list.querySelector('[data-slot="tabs-indicator"]')!
    Object.defineProperty(list, 'getClientRects', { configurable: true, value: () => [{ width: 300, height: 36 }] })
    setTabGeometry(summary, 0, 88)
    setTabGeometry(history, 91, 132)
    fireEvent(window, new Event('resize'))

    await waitFor(() => {
      expect(indicator).toHaveStyle({ width: '88px', transform: 'translateX(0px)', opacity: '1' })
    })
    expect(indicator.parentElement).toBe(list)
    expect(indicator).toHaveClass('duration-[250ms]', 'motion-reduce:transition-none')

    fireEvent.mouseDown(history, { button: 0, ctrlKey: false })
    await waitFor(() => {
      expect(history).toHaveAttribute('data-state', 'active')
      expect(indicator).toHaveStyle({ width: '132px', transform: 'translateX(91px)' })
    })
    expect(list.querySelectorAll('[role="tab"][data-state="active"]')).toHaveLength(1)

    history.focus()
    fireEvent.keyDown(history, { key: 'ArrowLeft' })
    await waitFor(() => {
      expect(summary).toHaveAttribute('data-state', 'active')
      expect(indicator).toHaveStyle({ width: '88px', transform: 'translateX(0px)' })
    })
  })

  it('updates the active width on resize and leaves non-line and vertical variants alone', async () => {
    const { rerender } = render(<Tabs defaultValue="one"><TabsList variant="line"><TabsTrigger value="one">Một</TabsTrigger><TabsTrigger value="two">Hai</TabsTrigger></TabsList></Tabs>)
    const one = screen.getByRole('tab', { name: 'Một' })
    const list = screen.getByRole('tablist')
    const indicator = list.querySelector('[data-slot="tabs-indicator"]')!
    Object.defineProperty(list, 'getClientRects', { configurable: true, value: () => [{ width: 200, height: 36 }] })
    setTabGeometry(one, 0, 70)
    fireEvent(window, new Event('resize'))
    await waitFor(() => expect(indicator).toHaveStyle({ width: '70px' }))
    setTabGeometry(one, 0, 104)
    fireEvent(window, new Event('resize'))
    await waitFor(() => expect(indicator).toHaveStyle({ width: '104px' }))

    rerender(<Tabs defaultValue="one"><TabsList><TabsTrigger value="one">Một</TabsTrigger></TabsList></Tabs>)
    expect(screen.getByRole('tablist').querySelector('[data-slot="tabs-indicator"]')).not.toBeInTheDocument()

    rerender(<Tabs defaultValue="one" orientation="vertical"><TabsList variant="line"><TabsTrigger value="one">Một</TabsTrigger></TabsList></Tabs>)
    expect(screen.getByRole('tablist').querySelector('[data-slot="tabs-indicator"]')).not.toBeInTheDocument()
  })
})
