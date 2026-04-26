import { createClient } from '@/lib/supabase/server'
import { ContactForm } from '@/components/public/ContactForm'

export const metadata = { title: 'Liên hệ | Gà Chọi Việt NB' }

export default async function LienHePage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', 'farm_info')
    .maybeSingle()

  const farm = ((data as { value: Record<string, string> } | null)?.value ?? {}) as {
    name?: string
    address?: string
    phone?: string
    zalo?: string
    facebook?: string
  }

  return (
    <div className="container mx-auto px-4 py-10 max-w-4xl">
      <h1 className="text-2xl md:text-3xl font-medium mb-6">Liên hệ {farm.name ?? 'Gà Chọi Việt NB'}</h1>

      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <h2 className="text-lg font-medium mb-4">Kênh liên hệ</h2>
          <div className="space-y-3">
            {farm.address && (
              <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded p-3 text-sm">
                📍 <strong>Địa chỉ:</strong> {farm.address}
              </div>
            )}
            {farm.phone && (
              <a href={`tel:${farm.phone}`} className="block bg-green-50 dark:bg-green-950/40 border border-green-200 rounded p-3 hover:bg-green-100 text-sm">
                📞 <strong>Hotline:</strong> {farm.phone}
              </a>
            )}
            {farm.zalo && (
              <a href={`https://zalo.me/${farm.zalo}`} target="_blank" rel="noopener noreferrer"
                className="block bg-blue-50 dark:bg-blue-950/40 border border-blue-200 rounded p-3 hover:bg-blue-100 text-sm">
                💬 <strong>Zalo:</strong> {farm.zalo}
              </a>
            )}
            {farm.facebook && (
              <a href={farm.facebook} target="_blank" rel="noopener noreferrer"
                className="block bg-blue-50 dark:bg-blue-950/40 border border-blue-200 rounded p-3 hover:bg-blue-100 text-sm">
                📘 Facebook
              </a>
            )}
            {!farm.phone && !farm.zalo && !farm.facebook && (
              <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                Thông tin liên hệ sẽ cập nhật sau. Vui lòng dùng form bên phải.
              </p>
            )}
          </div>

          {farm.address && (
            <div className="mt-6">
              <iframe
                src={`https://www.google.com/maps?q=${encodeURIComponent(farm.address)}&output=embed`}
                width="100%"
                height="240"
                loading="lazy"
                className="rounded border border-gray-200 dark:border-gray-700"
              />
            </div>
          )}
        </div>

        <div>
          <h2 className="text-lg font-medium mb-4">Gửi yêu cầu</h2>
          <ContactForm />
        </div>
      </div>
    </div>
  )
}
