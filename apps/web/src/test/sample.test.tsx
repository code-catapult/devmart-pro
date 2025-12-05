import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'

// Simple component for testing
function TestComponent() {
  const [count, setCount] = useState(0)

  return (
    <div>
      <h1>Testing Framework</h1>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  )
}

describe('Testing Framework Setup', () => {
  it('renders component correctly', () => {
    render(<TestComponent />)

    expect(screen.getByText('Testing Framework')).toBeInTheDocument()
    expect(screen.getByText('Count: 0')).toBeInTheDocument()
  })

  it('handles user interactions', async () => {
    const user = userEvent.setup()
    render(<TestComponent />)

    const button = screen.getByRole('button', { name: 'Increment' })
    await user.click(button)

    expect(screen.getByText('Count: 1')).toBeInTheDocument()
  })
})
