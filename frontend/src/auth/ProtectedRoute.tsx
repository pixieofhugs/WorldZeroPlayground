import { Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from './AuthContext'
import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  adminOnly?: boolean
}

export default function ProtectedRoute({ children, adminOnly = false }: Props) {
  const { user, loading } = useAuth()
  const { t } = useTranslation('common')

  if (loading) {
    return <div className="page font-body text-muted">{t('loading')}</div>
  }

  if (!user) {
    return <Navigate to="/?login=required" replace />
  }

  if (adminOnly && (user.character?.level ?? 0) < 1) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
