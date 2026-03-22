type Color = { name: string; hex: string; usage: string }
type Assistant = { name: string; role: string; desc: string }
type BrandData = {
  name: string; tagline: string; sector: string; market: string; tone: string
  primaryFont: string; logoDataUrl: string
  colors: Color[]; assistants: Assistant[]
  doList: string[]; dontList: string[]; keyMessages: string[]; hashtags: string[]
}

export function brandDataToGuide(d: BrandData): string {
  const lines: string[] = []

  if (d.name) lines.push(`# ${d.name} — Marka Rehberi\n`)

  lines.push("## 1. Marka Kimliği")
  if (d.name)     lines.push(`- **Marka adı:** ${d.name}`)
  if (d.tagline)  lines.push(`- **Tagline:** "${d.tagline}"`)
  if (d.sector)   lines.push(`- **Sektör:** ${d.sector}`)
  if (d.market)   lines.push(`- **Pazar:** ${d.market}`)
  if (d.tone)     lines.push(`- **Ton:** ${d.tone}`)
  lines.push("")

  if (d.assistants.length > 0) {
    lines.push("## 2. Yapay Zeka Asistanlar")
    for (const a of d.assistants) {
      if (a.name) lines.push(`- **${a.name}** — ${a.role}${a.desc ? ". " + a.desc : ""}`)
    }
    lines.push("> Asistanlardan 'yapay zeka asistan' olarak bahset, asla 'AI agent' deme.")
    lines.push("")
  }

  if (d.colors.length > 0) {
    lines.push("## 3. Renk Paleti")
    lines.push("| İsim | Hex | Kullanım |")
    lines.push("|------|-----|----------|")
    for (const c of d.colors) {
      if (c.hex) lines.push(`| ${c.name || "—"} | ${c.hex} | ${c.usage || "—"} |`)
    }
    lines.push("")
  }

  if (d.primaryFont) {
    lines.push("## 4. Tipografi")
    lines.push(`- **Font:** ${d.primaryFont}`)
    lines.push("")
  }

  if (d.doList.length > 0 || d.dontList.length > 0) {
    lines.push("## 5. Marka Sesi — Yap / Yapma")
    lines.push("| YAP | YAPMA |")
    lines.push("|-----|-------|")
    const maxLen = Math.max(d.doList.length, d.dontList.length)
    for (let i = 0; i < maxLen; i++) {
      lines.push(`| ${d.doList[i] || ""} | ${d.dontList[i] || ""} |`)
    }
    lines.push("")
  }

  if (d.keyMessages.length > 0) {
    lines.push("## 6. Ana Kampanya Mesajları")
    for (const m of d.keyMessages) {
      if (m) lines.push(`- ${m}`)
    }
    lines.push("")
  }

  if (d.hashtags.length > 0) {
    lines.push("## 7. Hashtag Şablonu")
    lines.push(d.hashtags.filter(Boolean).join(" "))
    lines.push("")
  }

  return lines.join("\n")
}
