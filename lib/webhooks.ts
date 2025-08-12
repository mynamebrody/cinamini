import { NextRequest } from "next/server"

// Lightweight user-agent parsing for basic device/browser info
function parseUserAgent(userAgent: string | null) {
  const ua = userAgent || ""
  let deviceType: "mobile" | "tablet" | "desktop" = "desktop"
  if (/ipad|tablet/i.test(ua)) deviceType = "tablet"
  else if (/mobi|android/i.test(ua)) deviceType = "mobile"

  let browser = "unknown"
  if (/edg\//i.test(ua)) browser = "edge"
  else if (/opr\//i.test(ua)) browser = "opera"
  else if (/firefox\//i.test(ua)) browser = "firefox"
  else if (/safari\//i.test(ua) && !/chrome|crios|android/i.test(ua)) browser = "safari"
  else if (/chrome|crios/i.test(ua)) browser = "chrome"

  return { deviceType, browser, userAgent: ua }
}

export type WebhookUser = {
  isAuthenticated: boolean
  id?: string | null
  email?: string | null
}

export type GuessWebhookPayload = {
  event: "guess"
  game: "retitled" | "poster-pixels" | "cast-climb" | "budget-bracket"
  timestamp: string
  user: WebhookUser
  device: {
    userAgent: string | null
    deviceType: string
    browser: string
    ipAddress: string | null
  }
  // Game-agnostic guess details
  guess: Record<string, any>
  // Game-specific progress info (e.g., round, attemptNumber)
  progress?: Record<string, any>
  // Correct answer summary
  correctAnswer?: Record<string, any>
}

export async function sendGuessWebhook(request: NextRequest, payload: Omit<GuessWebhookPayload, "timestamp" | "device">) {
  const url = process.env.CINAMINI_GUESS_WEBHOOK_URL
  console.log("📡 WEBHOOK: sendGuessWebhook called", {
    hasUrl: !!url,
    url: url,
    game: payload.game,
    isAuthenticated: payload.user.isAuthenticated
  })
  if (!url) {
    console.log("📡 WEBHOOK: No webhook URL found, exiting")
    return
  }

  const ua = request.headers.get("user-agent")
  const device = parseUserAgent(ua)
  
  // Extract IP address from request headers
  const getClientIP = (req: NextRequest): string | null => {
    const forwarded = req.headers.get('x-forwarded-for')
    const realIP = req.headers.get('x-real-ip')
    const cfConnectingIP = req.headers.get('cf-connecting-ip')
    
    if (forwarded) {
      return forwarded.split(',')[0].trim()
    }
    if (realIP) return realIP
    if (cfConnectingIP) return cfConnectingIP
    
    return req.ip || null
  }
  
  const clientIP = getClientIP(request)
  const finalPayload: GuessWebhookPayload = {
    ...payload,
    timestamp: new Date().toISOString(),
    device: {
      userAgent: ua,
      deviceType: device.deviceType,
      browser: device.browser,
      ipAddress: clientIP,
    },
  }

  try {
    console.log("📡 WEBHOOK: About to send webhook", {
      url,
      game: finalPayload.game,
      isAuthenticated: finalPayload.user.isAuthenticated,
      userId: finalPayload.user.id
    })
    
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 2000)

    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(finalPayload),
      signal: controller.signal,
    })
    
    console.log("📡 WEBHOOK: Webhook sent successfully", {
      status: response.status,
      game: finalPayload.game,
      isAuthenticated: finalPayload.user.isAuthenticated
    })
    
    clearTimeout(timeout)
  } catch (error) {
    console.error("📡 WEBHOOK: Webhook failed", error)
  }
}