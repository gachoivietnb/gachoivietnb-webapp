'use client'

import { useEffect, useRef, useState } from 'react'

type Message = { role: 'user' | 'assistant'; content: string }

export function ChatbotFloatingButton() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage() {
    if (!input.trim() || loading) return
    const userMsg: Message = { role: 'user', content: input }
    const history = [...messages, userMsg]
    setMessages(history)
    setInput('')
    setLoading(true)

    // Placeholder assistant message for streaming
    setMessages((m) => [...m, { role: 'assistant', content: '' }])

    try {
      const res = await fetch('/api/ai/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      })

      if (!res.ok) {
        const json = await res.json().catch(() => ({ error: 'Lỗi' }))
        setMessages((m) => {
          const arr = [...m]
          arr[arr.length - 1] = {
            role: 'assistant',
            content: `⚠️ ${typeof json.error === 'string' ? json.error : 'Lỗi chatbot'}`,
          }
          return arr
        })
        setLoading(false)
        return
      }

      if (!res.body) {
        setLoading(false)
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let acc = ''

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        acc += decoder.decode(value)
        setMessages((m) => {
          const arr = [...m]
          arr[arr.length - 1] = { role: 'assistant', content: acc }
          return arr
        })
      }
    } catch (e) {
      setMessages((m) => {
        const arr = [...m]
        arr[arr.length - 1] = {
          role: 'assistant',
          content: `⚠️ ${e instanceof Error ? e.message : 'Lỗi kết nối'}`,
        }
        return arr
      })
    }

    setLoading(false)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 md:bottom-6 md:right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center text-2xl z-40 hover:bg-blue-700"
        aria-label="Trợ lý AI"
      >
        💬
      </button>

      {open && (
        <div className="fixed inset-0 md:inset-auto md:bottom-24 md:right-6 md:w-96 md:h-[500px] bg-white dark:bg-gray-800 md:rounded-lg shadow-xl flex flex-col z-50 border border-gray-200 dark:border-gray-700">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div>
              <div className="font-medium">🤖 Trợ lý AI</div>
              <div className="text-[10px] text-gray-500 dark:text-gray-400">Hỏi về cách sử dụng hệ thống</div>
            </div>
            <button onClick={() => setOpen(false)} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">✕</button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-8 space-y-2">
                <div className="text-3xl">🤖</div>
                <p>Hỏi tôi về cách sử dụng hệ thống!</p>
                <div className="space-y-1 mt-4">
                  {[
                    'Làm sao để ghi buổi vần?',
                    'Cách tạo đơn hàng bán gà?',
                    'Tôi muốn in thẻ QR, phải làm gì?',
                  ].map((q) => (
                    <button
                      key={q}
                      onClick={() => setInput(q)}
                      className="block w-full text-left text-xs bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 rounded px-3 py-2"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'text-right' : 'text-left'}>
                <div
                  className={`inline-block max-w-[85%] px-3 py-2 rounded-lg text-sm whitespace-pre-wrap ${
                    m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  {m.content || (loading && i === messages.length - 1 ? '...' : '')}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 border-t border-gray-200 dark:border-gray-700 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Hỏi tôi..."
              className="flex-1 border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm"
              disabled={loading}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="bg-blue-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              Gửi
            </button>
          </div>
        </div>
      )}
    </>
  )
}
