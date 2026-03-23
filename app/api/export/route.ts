import puppeteerCore from "puppeteer-core"
import chromium from "@sparticuz/chromium-min"

const CHROMIUM_BINARY_URL =
  "https://github.com/Sparticuz/chromium/releases/download/v143.0.4/chromium-v143.0.4-pack.x64.tar"

// Increase timeout for long-running export
export const maxDuration = 60

const EXTRA_ARGS = [
  "--disable-web-security",
  "--disable-features=IsolateOrigins,site-per-process",
  "--allow-running-insecure-content",
]

async function launchBrowser() {
  if (process.env.VERCEL) {
    return puppeteerCore.launch({
      args: [...chromium.args, ...EXTRA_ARGS],
      executablePath: await chromium.executablePath(CHROMIUM_BINARY_URL),
      headless: true,
    })
  }
  // Local dev — use bundled puppeteer
  const puppeteer = await import("puppeteer")
  return puppeteer.default.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", ...EXTRA_ARGS],
  })
}

export async function POST(req: Request) {
  try {
    const { html, mode = "png", duration = 6000, fps = 5 } = await req.json()

    if (!html) {
      return Response.json({ error: "html gerekli" }, { status: 400 })
    }

    const browser = await launchBrowser()

    const page = await browser.newPage()
    await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 })

    // Inject the HTML and wait for fonts + network to settle
    await page.setContent(html, { waitUntil: "networkidle0", timeout: 15000 })

    // Explicitly wait for all images to finish loading or error out
    await page.evaluate(() =>
      Promise.all(
        Array.from(document.images).map(img =>
          img.complete
            ? Promise.resolve()
            : new Promise(res => { img.onload = res; img.onerror = res })
        )
      )
    )

    // Reset all animations to frame 0 — networkidle0 can take time during
    // which CSS animations have already progressed
    await page.evaluate(() => {
      document.getAnimations().forEach(anim => {
        anim.cancel()
        anim.play()
      })
    })

    if (mode === "png") {
      // Wait for animations to finish (designs animate over ~3-4 seconds)
      await new Promise(r => setTimeout(r, 4000))

      const screenshot = await page.screenshot({
        type: "png",
        clip: { x: 0, y: 0, width: 1080, height: 1920 },
        omitBackground: false,
      })

      await browser.close()

      return new Response(Buffer.from(screenshot), {
        headers: {
          "Content-Type": "image/png",
          "Content-Disposition": 'attachment; filename="design.png"',
        },
      })
    }

    // MP4 mode — capture frames at regular intervals
    if (mode === "frames") {
      const frameCount = Math.floor((duration / 1000) * fps)
      const frameInterval = 1000 / fps
      const frames: string[] = []

      for (let i = 0; i < frameCount; i++) {
        // First frame immediately, rest after interval
        if (i > 0) await new Promise(r => setTimeout(r, frameInterval))

        const screenshot = await page.screenshot({
          type: "jpeg",
          quality: 85,
          clip: { x: 0, y: 0, width: 1080, height: 1920 },
        })

        frames.push(Buffer.from(screenshot).toString("base64"))
      }

      await browser.close()

      return Response.json({ frames, fps, width: 1080, height: 1920 })
    }

    await browser.close()
    return Response.json({ error: "Geçersiz mod" }, { status: 400 })

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error("Export error:", msg)
    return Response.json({ error: msg }, { status: 500 })
  }
}
