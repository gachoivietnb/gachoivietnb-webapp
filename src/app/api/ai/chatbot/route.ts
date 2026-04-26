import { getGeminiConfig, toFriendlyAiError } from '@/lib/gemini/client'
import { SYSTEM_PROMPT_CHATBOT } from '@/lib/gemini/prompts'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

type Message = { role: 'user' | 'assistant'; content: string }

export async function POST(request: Request) {
  const { messages } = (await request.json()) as { messages?: Message[] }
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: 'Invalid messages' }, { status: 400 })
  }

  const config = await getGeminiConfig()
  if (!config.enabled || !config.apiKey) {
    return NextResponse.json(
      { error: 'AI chưa bật — vào /admin/cai-dat cấu hình Gemini key' },
      { status: 503 }
    )
  }

  const client = new GoogleGenerativeAI(config.apiKey)
  const model = client.getGenerativeModel({ model: config.model })

  const lastMessage = messages[messages.length - 1]
  const history = messages.slice(0, -1).map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))

  const chat = model.startChat({
    history: [
      { role: 'user', parts: [{ text: SYSTEM_PROMPT_CHATBOT }] },
      { role: 'model', parts: [{ text: 'Tôi đã sẵn sàng hỗ trợ bạn về hệ thống Gà Chọi Việt NB.' }] },
      ...history,
    ],
  })

  try {
    const stream = await chat.sendMessageStream(lastMessage.content)
    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream.stream) {
            const text = chunk.text()
            controller.enqueue(encoder.encode(text))
          }
          controller.close()
        } catch (e) {
          controller.enqueue(encoder.encode(`\n\n[Lỗi: ${e instanceof Error ? e.message : 'unknown'}]`))
          controller.close()
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    })
  } catch (e) {
    const err = toFriendlyAiError(e)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
