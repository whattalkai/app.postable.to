import { fal } from "@fal-ai/client"

function ensureFalConfig() {
  const key = process.env.FAL_KEY
  if (!key) throw new Error("FAL_KEY is not set")
  fal.config({ credentials: key })
}

// ── Image Generation (Nano Banana Pro via fal.ai) ──

interface ImageGenOptions {
  prompt: string
  negativePrompt?: string
  imageSize?: "portrait_4_3" | "portrait_16_9" | "square_hd" | "landscape_4_3" | "landscape_16_9"
  numImages?: number
  model?: "nano-banana-pro" | "nano-banana-2" | "nano-banana" | "flux-dev"
}

interface ImageResult {
  imageUrl: string
  width: number
  height: number
}

const IMAGE_MODELS: Record<string, string> = {
  "nano-banana-pro": "fal-ai/nano-banana-pro",
  "nano-banana-2": "fal-ai/nano-banana-2",
  "nano-banana": "fal-ai/nano-banana",
  "flux-dev": "fal-ai/flux/dev",
}

export async function generateImage(options: ImageGenOptions): Promise<ImageResult[]> {
  ensureFalConfig()

  const model = IMAGE_MODELS[options.model || "nano-banana-pro"]

  const input: Record<string, unknown> = {
    prompt: options.prompt,
    image_size: options.imageSize || "portrait_16_9",
    num_images: options.numImages || 1,
  }

  if (options.negativePrompt) {
    input.negative_prompt = options.negativePrompt
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await (fal as any).subscribe(model, { input })

  const data = result.data as { images?: { url: string; width: number; height: number }[] }

  return (data.images || []).map((img) => ({
    imageUrl: img.url,
    width: img.width,
    height: img.height,
  }))
}
