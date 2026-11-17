import { useEffect, useState } from 'react'

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]

interface TickerNumberProps {
  /** The final text to show, e.g. "3" or "$24,850". Only digits roll; other characters stay still. */
  value: string
}

/**
 * Odometer-style number: each digit rolls up into place once when the page loads.
 * Screen readers get the final value only. Users who prefer reduced motion see no roll.
 */
export function TickerNumber({ value }: TickerNumberProps) {
  const [rolled, setRolled] = useState(false)

  useEffect(() => {
    // Wait two frames so the browser paints the starting position before rolling.
    let second = 0
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => setRolled(true))
    })
    return () => {
      cancelAnimationFrame(first)
      cancelAnimationFrame(second)
    }
  }, [])

  return (
    <>
      <span className="sr-only">{value}</span>
      <span aria-hidden="true" className="inline-flex">
        {value.split('').map((char, index) => {
          if (!/\d/.test(char)) return <span key={index}>{char}</span>

          // Column holds 0–9 twice, so each digit spins one full turn before landing.
          const stop = 10 + Number(char)
          return (
            <span key={index} className="relative inline-block h-[1em] overflow-hidden">
              <span className="invisible">{char}</span>
              <span
                className="absolute inset-x-0 top-0 flex flex-col transition-transform duration-[1400ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none"
                style={{
                  transform: `translateY(-${rolled ? stop * 5 : 0}%)`,
                  transitionDelay: `${index * 90}ms`,
                }}
              >
                {[...DIGITS, ...DIGITS].map((digit, i) => (
                  <span key={i} className="block h-[1em]">
                    {digit}
                  </span>
                ))}
              </span>
            </span>
          )
        })}
      </span>
    </>
  )
}
