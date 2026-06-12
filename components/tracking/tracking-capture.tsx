"use client"

/**
 * TrackingCapture — runs on page mount, captures every attribution signal
 * the user arrived with, persists to sessionStorage so it survives the
 * multi-step form, and lets the form read it at submit.
 *
 * What we capture:
 *   - UTMs: utm_source, utm_medium, utm_campaign, utm_content, utm_term
 *   - Click IDs: fbclid, gclid, ttclid, msclkid
 *   - Facebook cookies: _fbp (browser pixel ID), _fbc (click cookie)
 *   - Document referrer
 *   - First-touch URL
 *   - Timestamp
 *
 * Why sessionStorage: the multi-step form is one SPA session; sessionStorage
 * is the cleanest scope that survives step transitions without polluting
 * the user's storage long-term. Cleared when the tab closes.
 *
 * Once-only: if a value is already stored, we DON'T overwrite — first-touch
 * UTMs win even if the user navigates and lands on /v3 again with no UTMs.
 */

import { useEffect } from "react"

const STORAGE_KEY = "rei_tracking_v1"

type TrackingPayload = {
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_content?: string
  utm_term?: string
  fbclid?: string
  gclid?: string
  ttclid?: string
  msclkid?: string
  epik?: string
  sclid?: string
  li_fat_id?: string
  fbp?: string
  fbc?: string
  referrer?: string
  landing_url?: string
  captured_at?: string
}

function readCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined
  const match = document.cookie.match(new RegExp("(?:^|; )" + name.replace(/[.$?*|{}()[\]\\/+^]/g, "\\$&") + "=([^;]*)"))
  return match ? decodeURIComponent(match[1]) : undefined
}

export function TrackingCapture() {
  useEffect(() => {
    if (typeof window === "undefined") return

    // Read what we already have so we don't overwrite first-touch values.
    let existing: TrackingPayload = {}
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY)
      if (raw) existing = JSON.parse(raw) as TrackingPayload
    } catch { /* ignore */ }

    const params = new URLSearchParams(window.location.search)
    const fresh: TrackingPayload = { ...existing }

    // UTMs + click IDs from URL
    const urlKeys = [
      "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term",
      "fbclid", "gclid", "ttclid", "msclkid",
      "epik", "sclid", "li_fat_id",
    ] as const

    for (const k of urlKeys) {
      const v = params.get(k)
      if (v && !fresh[k]) fresh[k] = v
    }

    // Facebook cookies (set by the pixel — we just read them for CAPI parity)
    const fbp = readCookie("_fbp")
    const fbc = readCookie("_fbc")
    if (fbp && !fresh.fbp) fresh.fbp = fbp
    if (fbc && !fresh.fbc) fresh.fbc = fbc

    // First-touch context
    if (!fresh.referrer) fresh.referrer = document.referrer || ""
    if (!fresh.landing_url) fresh.landing_url = window.location.href
    if (!fresh.captured_at) fresh.captured_at = new Date().toISOString()

    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(fresh))
    } catch { /* storage may be disabled */ }
  }, [])

  return null
}

/**
 * Helper for the form: pull the captured tracking out at submit time.
 * Returns an empty object if storage is empty/disabled.
 */
export function readCapturedTracking(): TrackingPayload {
  if (typeof window === "undefined") return {}
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as TrackingPayload
  } catch {
    return {}
  }
}
