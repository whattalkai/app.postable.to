import Anthropic from "@anthropic-ai/sdk"

const client = new Anthropic()

const WEBPAGE_BRAND_AGENT_PROMPT = `
Sen bir web tasarım stratejistsin.
Kullanıcının websitesi isteğini alıp şu bilgileri çıkar ve JSON döndür:

{
  "purpose": "sitenin amacı (tanıtım / landing page / portfolio / e-ticaret / blog)",
  "tone": "tasarım tonu (modern / minimal / kurumsal / cesur / eğlenceli)",
  "targetAudience": "hedef kitle",
  "keyMessage": "tek cümlelik ana mesaj",
  "callToAction": "harekete geçirici metin",
  "sections": ["hero", "features", "testimonials", "pricing", "contact"],
  "visualMood": "görsel hava (karanlık+aksan / aydınlık+minimal / renkli+cesur)"
}

Kurallar:
- Türkçe yaz
- Resmi "siz" dili kullan
- Sadece JSON döndür
`

const WEBPAGE_DESIGNER_PROMPT = `
Sen profesyonel bir web tasarımcısın. Lovable, Framer ve modern web standartlarında websitesi tasarlıyorsun.
Sana verilen briefing ve konu doğrultusunda tek bir self-contained HTML dosyası üret.

ZORUNLU KURALLAR:
- Tam genişlik (width: 100%), responsive düşün ama çıktı desktop-first olsun
- Viewport: 1440px genişlik referans al, min-height: 900px
- Font: Sadece Inter — @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap')
- Modern, profesyonel web tasarımı — Lovable/Framer kalitesinde
- Scroll edilebilir, çok bölümlü sayfa (hero, features, testimonials, CTA, footer vb.)
- Gerçekçi içerik kullan (placeholder değil, gerçek Türkçe metinler)
- Smooth scroll, hover efektleri, micro-animasyonlar
- CSS Grid ve Flexbox kullan
- Koyu tema varsayılan: #0A0A0A arkaplan, beyaz/açık metin
- Gradyanlar, blur efektleri, modern UI pattern'ları kullan
- Butonlar tıklanabilir görünsün (hover state'leri ile)
- SVG ikonlar inline kullan — harici dosya referans verme
- Görseller için gradient placeholder'lar veya CSS art kullan
- html, body: margin:0; padding:0; width:100%; overflow-x:hidden
- Animasyonlar: fadeIn, slideUp — scroll ile tetiklenen IntersectionObserver animasyonları
- Navigation bar: fixed top, blur backdrop
- Footer: koyu, iletişim bilgileri ile
- Asla "AI" yazma — "Yapay Zeka" kullan (Türkçe içerik varsa)

MARKA BİLGİSİ:
Eğer marka rehberi verilmişse, renkleri, fontları, tonu ve mesajları oradan al.
Marka rehberi yoksa modern, minimal ve profesyonel bir tasarım yap.

ÇIKTI:
Sadece HTML döndür — markdown, açıklama, kod bloğu çerçevesi YASAK.
`

type ImageMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp"

function buildContent(
  images: string[] | undefined,
  textBlock: string
): Anthropic.MessageParam["content"] {
  if (!images || images.length === 0) return textBlock

  const parts: Anthropic.ContentBlockParam[] = [
    { type: "text", text: "Referans görseller (stil, renk ve kompozisyonu referans al):" },
  ]

  for (const dataUrl of images) {
    const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/)
    if (m) {
      parts.push({
        type: "image",
        source: {
          type: "base64",
          media_type: m[1] as ImageMediaType,
          data: m[2],
        },
      })
    }
  }

  parts.push({ type: "text", text: `\n${textBlock}` })
  return parts
}

export async function POST(req: Request) {
  try {
    const { topic, brandGuide, images } = await req.json()

    if (!topic) {
      return Response.json({ error: "Eksik parametreler" }, { status: 400 })
    }

    const brandContext = brandGuide
      ? `\n\n## Marka Rehberi (Kullanıcı Tanımlı)\n${brandGuide}`
      : ""

    // ── AGENT 1: Strategy Agent ──
    const brandResponse = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: WEBPAGE_BRAND_AGENT_PROMPT + brandContext,
      messages: [{
        role: "user",
        content: `Websitesi isteği: ${topic}`
      }]
    })

    const brief = brandResponse.content[0].type === "text"
      ? brandResponse.content[0].text.trim()
      : "{}"

    // ── AGENT 2: Designer ──
    const designerText = `Strateji Briefingi:\n${brief}\n\nKonu: ${topic}${brandContext}`

    const designStream = await client.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 16384,
      system: WEBPAGE_DESIGNER_PROMPT,
      messages: [{ role: "user", content: buildContent(images, designerText) }]
    })

    const finalMessage = await designStream.finalMessage()

    let html = finalMessage.content[0].type === "text"
      ? finalMessage.content[0].text.trim()
      : ""

    // Strip markdown code fences if present
    if (html.startsWith("```html")) {
      html = html.replace(/^```html\n?/, "").replace(/```$/, "").trim()
    } else if (html.startsWith("```")) {
      html = html.replace(/^```\n?/, "").replace(/```$/, "").trim()
    }

    return Response.json({ html, brief })

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error("Webpage generate error:", msg)
    return Response.json({ error: msg }, { status: 500 })
  }
}
