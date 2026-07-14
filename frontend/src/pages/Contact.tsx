import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../api/axios'
import PageTitle from '../components/ui/PageTitle'

type FormState = { name: string; email: string; message: string }

export default function Contact() {
  const { t } = useTranslation('common')
  const [form, setForm] = useState<FormState>({ name: '', email: '', message: '' })
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await api.post('/contact', form)
      setSuccess(true)
    } catch {
      setError(t('contact.error'))
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="py-8 max-w-2xl">
        <PageTitle title={t('contact.title')} />
        <div className="card p-6 text-center">
          <p className="font-display text-2xl font-bold mb-2">{t('contact.sentHeading')}</p>
          <p className="font-body text-muted">{t('contact.sentBody')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="py-8 max-w-2xl">
      <PageTitle title={t('contact.title')} />
      <p className="font-body text-muted mb-6">
        {t('contact.intro')}
      </p>

      <form onSubmit={handleSubmit} className="card p-6 space-y-4">
        <div>
          <label className="font-body text-sm block mb-1" htmlFor="name">
            {t('contact.nameLabel')}
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            maxLength={100}
            value={form.name}
            onChange={handleChange}
            disabled={submitting}
            className="w-full border-2 border-border bg-card font-body text-sm px-3 py-2 focus:outline-none focus:shadow-sketch-sm disabled:opacity-50"
          />
          <span className={`font-body text-xs self-end ${form.name.length >= 90 ? 'text-red-600' : 'text-muted'}`} style={{ textAlign: 'right', display: 'block' }}>{form.name.length}/100</span>
        </div>

        <div>
          <label className="font-body text-sm block mb-1" htmlFor="email">
            {t('contact.emailLabel')}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            maxLength={254}
            value={form.email}
            onChange={handleChange}
            disabled={submitting}
            className="w-full border-2 border-border bg-card font-body text-sm px-3 py-2 focus:outline-none focus:shadow-sketch-sm disabled:opacity-50"
          />
        </div>

        <div>
          <label className="font-body text-sm block mb-1" htmlFor="message">
            {t('contact.messageLabel')}
          </label>
          <textarea
            id="message"
            name="message"
            required
            maxLength={5000}
            rows={6}
            value={form.message}
            onChange={handleChange}
            disabled={submitting}
            className="w-full border-2 border-border bg-card font-body text-sm px-3 py-2 focus:outline-none focus:shadow-sketch-sm disabled:opacity-50 resize-y"
          />
          <span className={`font-body text-xs ${form.message.length >= 4500 ? 'text-red-600' : 'text-muted'}`} style={{ textAlign: 'right', display: 'block' }}>{form.message.length}/5000</span>
        </div>

        {error && (
          <p className="font-body text-sm border-2 border-border px-3 py-2">
            {error}
          </p>
        )}

        <button type="submit" disabled={submitting} className="btn-primary disabled:opacity-50">
          {submitting ? t('contact.sending') : t('contact.send')}
        </button>
      </form>
    </div>
  )
}
