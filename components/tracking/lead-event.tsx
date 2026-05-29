"use client"

import { useEffect } from "react"

export function LeadEvent() {
  useEffect(() => {
    const fire = () => {
      if (typeof window !== "undefined" && window.fbq) {
        window.fbq("track", "Lead")
        return true
      }
      return false
    }

    // Try immediately
    if (fire()) return

    // Poll until fbq is available (pixel loads async)
    const interval = setInterval(() => {
      if (fire()) clearInterval(interval)
    }, 200)

    // Give up after 10s
    const timeout = setTimeout(() => clearInterval(interval), 10000)

    return () => {
      clearInterval(interval)
      clearTimeout(timeout)
    }
  }, [])

  return null
}
