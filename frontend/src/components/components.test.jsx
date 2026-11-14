import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import Astronaut, { DEFAULT_AVATAR } from './Astronaut'
import RocketSVG from './RocketSVG'
import { XPBar } from './ui'
import Fallback2D from '../features/solar-system/Fallback2D'

describe('Astronaut', () => {
  it('renders an accessible SVG for the avatar', () => {
    render(<Astronaut avatar={{ ...DEFAULT_AVATAR, helmet_style: 'cat', accessory: 'antenna' }} />)
    expect(screen.getByRole('img', { name: /astronaut avatar/i })).toBeInTheDocument()
  })
})

describe('RocketSVG', () => {
  it('renders with partial parts', () => {
    render(<RocketSVG parts={{ nose: 'nose_cone' }} />)
    expect(screen.getByRole('img', { name: 'Rocket' })).toBeInTheDocument()
  })
})

describe('XPBar', () => {
  it('shows level, XP and the next level', () => {
    render(<XPBar level={{ level: 2, level_name: 'Junior Explorer', total_xp: 250, progress_percent: 17, xp_to_next: 250, next_level_name: 'Junior Astronaut' }} />)
    expect(screen.getByText(/Level 2: Junior Explorer/)).toBeInTheDocument()
    expect(screen.getByText('250 XP')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '17')
    expect(screen.getByText(/to become Junior Astronaut/)).toBeInTheDocument()
  })
})

describe('Fallback2D solar system', () => {
  it('lets a child pick a planet without WebGL', () => {
    const planets = [{ slug: 'earth', name: 'Earth', color: '#3E8EDE' }, { slug: 'mars', name: 'Mars', color: '#D9643A' }]
    const onSelect = vi.fn()
    render(<Fallback2D planets={planets} selected={null} onSelect={onSelect} />)
    fireEvent.click(screen.getByRole('button', { name: /select mars/i }))
    expect(onSelect).toHaveBeenCalledWith('mars')
  })
})
