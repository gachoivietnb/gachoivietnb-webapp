'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  type CashAccountBalance,
  type AccountType,
  ACCOUNT_TYPE_META,
  ACCOUNT_COLOR_PRESETS,
  ACCOUNT_ICON_PRESETS,
  formatVnd,
} from '@/lib/treasury/types'

type AccountFormState = {
  id?: string
  name: string
  account_type: AccountType
  bank_name: string
  account_number: string
  initial_balance: number
  initial_balance_date: string
  is_default: boolean
  is_active: boolean
  color: string
  icon: string
  notes: string
}

const EMPTY: AccountFormState = {
  name: '',
  account_type: 'cash',
  bank_name: '',
  account_number: '',
  initial_balance: 0,
  initial_balance_date: new Date().toISOString().slice(0, 10),
  is_default: false,
  is_active: true,
  color: 'from-emerald-500 to-teal-500',
  icon: '💵',
  notes: '',
}

export function AccountsCrudClient({
  initialAccounts,
}: {
  initialAccounts: CashAccountBalance[]
}) {
  const router = useRouter()
  const [accounts, setAccounts] = useState<CashAccountBalance[]>(initialAccounts)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<AccountFormState>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    const res = await fetch('/api/treasury/accounts')
    if (res.ok) {
      const j = await res.json()
      setAccounts(j.data ?? [])
    }
  }

  function openNew() {
    setEditing(EMPTY)
    setError(null)
    setModalOpen(true)
  }

  function openEdit(a: CashAccountBalance) {
    setEditing({
      id: a.account_id,
      name: a.name,
      account_type: a.account_type,
      bank_name: a.bank_name ?? '',
      account_number: a.account_number ?? '',
      initial_balance: a.initial_balance,
      initial_balance_date: new Date().toISOString().slice(0, 10),
      is_default: a.is_default,
      is_active: a.is_active,
      color: a.color,
      icon: a.icon,
      notes: '',
    })
    setError(null)
    setModalOpen(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (editing.name.trim().length < 1) {
      setError('Vui lòng nhập tên tài khoản')
      return
    }
    setSaving(true)

    const payload = {
      name: editing.name.trim(),
      account_type: editing.account_type,
      bank_name: editing.bank_name || null,
      account_number: editing.account_number || null,
      initial_balance: editing.initial_balance,
      initial_balance_date: editing.initial_balance_date,
      is_default: editing.is_default,
      color: editing.color,
      icon: editing.icon,
      notes: editing.notes || null,
      ...(editing.id ? { is_active: editing.is_active } : {}),
    }

    const res = editing.id
      ? await fetch(`/api/treasury/accounts/${editing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      : await fetch('/api/treasury/accounts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
    setSaving(false)
    if (!res.ok) {
      const j = await res.json()
      setError(typeof j.error === 'string' ? j.error : 'Lỗi lưu')
      return
    }
    setModalOpen(false)
    await load()
    router.refresh()
  }

  async function handleDelete(a: CashAccountBalance) {
    if (
      !confirm(
        `Xoá tài khoản "${a.name}"?\n\nLưu ý: chỉ xoá được khi tài khoản chưa có giao dịch nào.\nNếu đã có giao dịch, hãy chỉnh sửa và đặt "Đang dùng = không" để ẩn thay vì xoá.`
      )
    )
      return
    const res = await fetch(`/api/treasury/accounts/${a.account_id}`, { method: 'DELETE' })
    if (!res.ok) {
      const j = await res.json()
      alert('Lỗi: ' + (typeof j.error === 'string' ? j.error : 'unknown'))
      return
    }
    await load()
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {accounts.length} tài khoản · Tổng số dư:{' '}
          <b className="text-gray-900 dark:text-gray-100 tabular-nums">
            {formatVnd(accounts.reduce((s, a) => s + a.current_balance, 0))}
          </b>
        </p>
        <button
          onClick={openNew}
          className="bg-orange-500 hover:bg-orange-600 text-white rounded-lg px-4 py-2 text-sm font-semibold shadow"
        >
          + Tạo tài khoản
        </button>
      </div>

      {accounts.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-12 text-center">
          <div className="text-5xl mb-3">🏦</div>
          <div className="text-base font-semibold mb-1">Chưa có tài khoản nào</div>
          <button
            onClick={openNew}
            className="mt-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg px-4 py-2 text-sm font-semibold"
          >
            + Tạo tài khoản đầu tiên
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {accounts.map((a) => (
            <AccountCard key={a.account_id} acc={a} onEdit={() => openEdit(a)} onDelete={() => handleDelete(a)} />
          ))}
        </div>
      )}

      {modalOpen && (
        <AccountFormModal
          editing={editing}
          setEditing={setEditing}
          onSubmit={handleSave}
          onClose={() => setModalOpen(false)}
          saving={saving}
          error={error}
        />
      )}
    </div>
  )
}

function AccountCard({
  acc,
  onEdit,
  onDelete,
}: {
  acc: CashAccountBalance
  onEdit: () => void
  onDelete: () => void
}) {
  const typeMeta = ACCOUNT_TYPE_META[acc.account_type]
  return (
    <div
      className={
        'bg-white dark:bg-gray-800 border rounded-2xl p-4 transition shadow-sm hover:shadow ' +
        (acc.is_active
          ? 'border-gray-200 dark:border-gray-700'
          : 'border-gray-200 dark:border-gray-700 opacity-60')
      }
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className={`w-12 h-12 rounded-xl bg-gradient-to-br ${acc.color} text-white flex items-center justify-center text-2xl shadow`}
        >
          {acc.icon}
        </div>
        <div className="flex flex-wrap gap-1 justify-end">
          {acc.is_default && (
            <span className="text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 rounded-full px-2 py-0.5">
              ⭐ Mặc định
            </span>
          )}
          {!acc.is_active && (
            <span className="text-[10px] font-bold bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded-full px-2 py-0.5">
              Đã ẩn
            </span>
          )}
          <span className={'text-[10px] font-bold rounded-full px-2 py-0.5 border ' + typeMeta.cls}>
            {typeMeta.emoji} {typeMeta.label}
          </span>
        </div>
      </div>

      <div className="font-bold text-gray-900 dark:text-gray-100">{acc.name}</div>
      {acc.bank_name && (
        <div className="text-[11px] text-gray-500 dark:text-gray-400">{acc.bank_name}</div>
      )}
      {acc.account_number && (
        <div className="text-[11px] text-gray-500 dark:text-gray-400 font-mono">{acc.account_number}</div>
      )}

      <div
        className={
          'mt-3 text-2xl font-extrabold tabular-nums ' +
          (acc.current_balance < 0 ? 'text-rose-600' : 'text-gray-900 dark:text-gray-100')
        }
      >
        {formatVnd(acc.current_balance)}
      </div>
      <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
        {acc.transaction_count} giao dịch · {formatVnd(acc.total_in)} vào · {formatVnd(acc.total_out)} ra
      </div>

      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex gap-1.5">
        <button
          onClick={onEdit}
          className="flex-1 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 rounded-lg py-1.5 text-xs font-semibold hover:bg-blue-100 dark:hover:bg-blue-900/50"
        >
          ✏️ Sửa
        </button>
        <button
          onClick={onDelete}
          className="flex-1 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 rounded-lg py-1.5 text-xs font-semibold hover:bg-rose-100 dark:hover:bg-rose-900/50"
        >
          🗑 Xoá
        </button>
      </div>
    </div>
  )
}

function AccountFormModal({
  editing,
  setEditing,
  onSubmit,
  onClose,
  saving,
  error,
}: {
  editing: AccountFormState
  setEditing: React.Dispatch<React.SetStateAction<AccountFormState>>
  onSubmit: (e: React.FormEvent) => void
  onClose: () => void
  saving: boolean
  error: string | null
}) {
  function update<K extends keyof AccountFormState>(k: K, v: AccountFormState[K]) {
    setEditing((s) => ({ ...s, [k]: v }))
  }
  const isEdit = Boolean(editing.id)
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm p-0 md:p-4">
      <div className="w-full max-w-xl bg-white dark:bg-gray-800 rounded-t-2xl md:rounded-2xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col">
        <div className={`px-5 py-4 bg-gradient-to-r ${editing.color} text-white flex items-center justify-between`}>
          <h2 className="text-lg font-bold">
            {editing.icon} {isEdit ? 'Sửa tài khoản' : 'Tạo tài khoản mới'}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-lg"
          >
            ×
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-5 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Tên tài khoản" required>
              <input
                type="text"
                required
                value={editing.name}
                onChange={(e) => update('name', e.target.value)}
                className="input-cls"
                placeholder="VD: Két tiền mặt, VCB Hậu..."
              />
            </Field>
            <Field label="Loại">
              <select
                value={editing.account_type}
                onChange={(e) => update('account_type', e.target.value as AccountType)}
                className="input-cls"
              >
                {(Object.keys(ACCOUNT_TYPE_META) as AccountType[]).map((t) => (
                  <option key={t} value={t}>
                    {ACCOUNT_TYPE_META[t].emoji} {ACCOUNT_TYPE_META[t].label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {(editing.account_type === 'bank' || editing.account_type === 'ewallet') && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label={editing.account_type === 'bank' ? 'Tên ngân hàng' : 'Tên ví'}>
                <input
                  type="text"
                  value={editing.bank_name}
                  onChange={(e) => update('bank_name', e.target.value)}
                  className="input-cls"
                  placeholder={editing.account_type === 'bank' ? 'Vietcombank, MB Bank...' : 'MoMo, ZaloPay...'}
                />
              </Field>
              <Field label="Số TK / SĐT ví">
                <input
                  type="text"
                  value={editing.account_number}
                  onChange={(e) => update('account_number', e.target.value)}
                  className="input-cls font-mono"
                  placeholder="VD: 1234567890"
                />
              </Field>
            </div>
          )}

          {!isEdit && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Số dư hiện tại" hint="Hệ thống tự ghi 1 bút toán mở quỹ">
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={editing.initial_balance > 0 ? editing.initial_balance.toLocaleString('vi-VN') : ''}
                    onChange={(e) => {
                      const n = Number(e.target.value.replace(/[^\d]/g, ''))
                      update('initial_balance', n)
                    }}
                    className="input-cls pr-8"
                    placeholder="0"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 text-sm">đ</span>
                </div>
              </Field>
              <Field label="Tính từ ngày">
                <input
                  type="date"
                  value={editing.initial_balance_date}
                  onChange={(e) => update('initial_balance_date', e.target.value)}
                  className="input-cls"
                />
              </Field>
            </div>
          )}

          {/* Icon picker */}
          <Field label="Biểu tượng">
            <div className="flex flex-wrap gap-1.5">
              {ACCOUNT_ICON_PRESETS.map((ic) => (
                <button
                  type="button"
                  key={ic}
                  onClick={() => update('icon', ic)}
                  className={
                    'w-9 h-9 rounded-lg border-2 text-lg transition ' +
                    (editing.icon === ic
                      ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/40'
                      : 'border-gray-200 dark:border-gray-700 hover:border-orange-300')
                  }
                >
                  {ic}
                </button>
              ))}
            </div>
          </Field>

          {/* Color picker */}
          <Field label="Màu sắc">
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
              {ACCOUNT_COLOR_PRESETS.map((c) => (
                <button
                  type="button"
                  key={c.value}
                  onClick={() => update('color', c.value)}
                  title={c.label}
                  className={
                    'h-9 rounded-lg bg-gradient-to-br ' +
                    c.value +
                    ' ' +
                    (editing.color === c.value
                      ? 'ring-2 ring-orange-500 ring-offset-2 dark:ring-offset-gray-800'
                      : 'hover:scale-105 transition')
                  }
                />
              ))}
            </div>
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={editing.is_default}
                onChange={(e) => update('is_default', e.target.checked)}
                className="w-4 h-4"
              />
              <span>⭐ Đặt làm mặc định cho thu chi nhanh</span>
            </label>

            {isEdit && (
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={editing.is_active}
                  onChange={(e) => update('is_active', e.target.checked)}
                  className="w-4 h-4"
                />
                <span>Đang sử dụng (bỏ tick để ẩn)</span>
              </label>
            )}
          </div>

          {error && (
            <div className="text-sm text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-lg px-3 py-2">
              ⚠️ {error}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 font-semibold hover:bg-gray-50 dark:hover:bg-gray-700/50"
            >
              Huỷ
            </button>
            <button
              type="submit"
              disabled={saving}
              className={
                'flex-1 px-4 py-2.5 rounded-xl text-white font-bold shadow-md disabled:opacity-50 bg-gradient-to-r ' +
                editing.color
              }
            >
              {saving ? 'Đang lưu...' : isEdit ? '💾 Lưu thay đổi' : '+ Tạo tài khoản'}
            </button>
          </div>
        </form>

        <style jsx global>{`
          .input-cls {
            width: 100%;
            padding: 0.5rem 0.75rem;
            border-radius: 0.5rem;
            border: 1px solid rgb(209 213 219);
            background: white;
            font-size: 0.875rem;
            color: rgb(17 24 39);
          }
          .input-cls:focus {
            outline: none;
            border-color: rgb(249 115 22);
            box-shadow: 0 0 0 3px rgb(254 215 170 / 0.5);
          }
          .dark .input-cls {
            background: rgb(31 41 55);
            border-color: rgb(75 85 99);
            color: rgb(243 244 246);
          }
        `}</style>
      </div>
    </div>
  )
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string
  required?: boolean
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">{hint}</p>}
    </div>
  )
}
