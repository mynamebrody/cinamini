import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { text, targetLang = 'en' } = await request.json()
    
    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 })
    }

    // Use Google Translate API (free tier)
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`
    
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error('Translation failed')
    }
    
    const data = await response.json()
    const translatedText = data[0][0][0]
    
    return NextResponse.json({ 
      translatedText,
      sourceText: text,
      targetLang 
    })
  } catch (error) {
    console.error("Translation error:", error)
    return NextResponse.json({ error: "Translation failed" }, { status: 500 })
  }
}