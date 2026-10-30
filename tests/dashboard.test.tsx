import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { DashboardPage } from '@/features/dashboard/DashboardPage'

describe('DashboardPage', () => {
  it('renders summary metrics and recent activity', () => {
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { name: 'Tổng quan' })).toBeInTheDocument()
    expect(screen.getByText('Tổng người dùng')).toBeInTheDocument()
    expect(screen.getByText('Nguyễn Minh Anh')).toBeInTheDocument()
  })
})
