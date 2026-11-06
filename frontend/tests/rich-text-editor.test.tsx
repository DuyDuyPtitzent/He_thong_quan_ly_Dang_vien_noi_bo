import { createElement, useEffect } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RichTextEditor } from '@/shared/components/RichTextEditor'

const tinyMce = vi.hoisted(() => ({ props: null as Record<string, unknown> | null }))
afterEach(() => cleanup())

vi.mock('@tinymce/tinymce-react', () => ({
  Editor: (props: Record<string, any>) => {
    tinyMce.props = props
    useEffect(() => { props.onInit?.({}, {}) }, [props.onInit])
    return createElement('textarea', {
      'aria-label': props.init.aria_label,
      'data-testid': 'tiny-editor',
      value: props.value,
      readOnly: props.readonly,
      disabled: props.disabled,
      onBlur: props.onBlur,
      onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => props.onEditorChange(event.target.value, { undoManager: { ignore: (callback: () => void) => callback() }, setContent: vi.fn() }),
    })
  },
}))

describe('RichTextEditor', () => {
  it('switches the shared instance between simple and full free toolbars', () => {
    const onChange = vi.fn()
    const view = render(<RichTextEditor label="Nội dung" value="" onChange={onChange} mode="simple"/>)
    expect(tinyMce.props?.init).toMatchObject({ plugins: 'advlist lists link table' })
    expect(tinyMce.props?.init && (tinyMce.props.init as { toolbar: string }).toolbar).toContain('bold italic underline')
    view.rerender(<RichTextEditor label="Nội dung" value="" onChange={onChange} mode="full"/>)
    const toolbar = (tinyMce.props?.init as { toolbar: string }).toolbar
    expect(toolbar).toContain('fontfamily fontsize')
    expect(toolbar).toContain('table hr')
    expect(toolbar).not.toMatch(/image|media|exportword|importword/)
  })

  it('shows required validation and passes read-only state to TinyMCE', () => {
    const view = render(<RichTextEditor label="Lý do" value="" onChange={vi.fn()} required readOnly/>)
    fireEvent.blur(screen.getByTestId('tiny-editor'))
    expect(screen.getByRole('alert')).toHaveTextContent('Trường này là bắt buộc.')
    expect(screen.getByTestId('tiny-editor')).toHaveAttribute('readonly')
    expect((tinyMce.props?.init as { toolbar: false }).toolbar).toBe(false)
    view.rerender(<RichTextEditor label="Lý do" value="Nội dung" onChange={vi.fn()} readOnly/>)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('enforces the plain-text maximum and reports changes to its caller', () => {
    const onChange = vi.fn()
    render(<RichTextEditor value="ok" onChange={onChange} maxLength={4}/>)
    fireEvent.change(screen.getByTestId('tiny-editor'), { target: { value: 'valid' } })
    expect(onChange).not.toHaveBeenCalled()
    fireEvent.change(screen.getByTestId('tiny-editor'), { target: { value: 'fine' } })
    expect(onChange).toHaveBeenCalledWith('fine')
  })
})
