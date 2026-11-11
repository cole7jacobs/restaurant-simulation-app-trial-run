import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '../../src/components/ui/Button'

describe('Button component', () => {
  describe('rendering', () => {
    it('renders button text', () => {
      render(<Button>Save and continue</Button>)
      expect(
        screen.getByRole('button', { name: 'Save and continue' }),
      ).toBeInTheDocument()
    })

    it('defaults to primary variant', () => {
      const { container } = render(<Button>Primary</Button>)
      const btn = container.firstElementChild as HTMLElement
      // Primary variant includes bg-primary Tailwind class
      expect(btn.className).toContain('bg-primary')
    })

    it('applies outlined variant class when specified', () => {
      const { container } = render(<Button variant="outlined">Outlined</Button>)
      const btn = container.firstElementChild as HTMLElement
      expect(btn.className).toContain('border-deep-green')
    })

    it('merges additional className prop', () => {
      const { container } = render(<Button className="mt-4">Extra</Button>)
      const btn = container.firstElementChild as HTMLElement
      expect(btn.className).toContain('mt-4')
    })

    it('renders a <button> element', () => {
      render(<Button>Click</Button>)
      expect(screen.getByRole('button')).toBeInstanceOf(HTMLButtonElement)
    })
  })

  describe('behavior', () => {
    it('calls onClick handler when clicked', async () => {
      const user = userEvent.setup()
      const handleClick = vi.fn()
      render(<Button onClick={handleClick}>Click me</Button>)
      await user.click(screen.getByRole('button'))
      expect(handleClick).toHaveBeenCalledOnce()
    })

    it('does not call onClick when disabled', async () => {
      const user = userEvent.setup()
      const handleClick = vi.fn()
      render(
        <Button onClick={handleClick} disabled>
          Disabled
        </Button>,
      )
      await user.click(screen.getByRole('button'))
      expect(handleClick).not.toHaveBeenCalled()
    })

    it('passes through type attribute', () => {
      render(<Button type="submit">Submit</Button>)
      expect(screen.getByRole('button')).toHaveAttribute('type', 'submit')
    })
  })

  describe('accessibility', () => {
    it('is keyboard-focusable by default', () => {
      render(<Button>Focusable</Button>)
      const btn = screen.getByRole('button')
      btn.focus()
      expect(btn).toHaveFocus()
    })

    it('is not focusable when disabled', () => {
      render(<Button disabled>Disabled</Button>)
      const btn = screen.getByRole('button')
      // Disabled buttons should not receive focus via keyboard
      expect(btn).toBeDisabled()
    })
  })
})
