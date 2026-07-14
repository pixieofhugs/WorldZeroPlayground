import { useTranslation } from 'react-i18next'
import PageTitle from '../components/ui/PageTitle'
const attributions = [
  {
    name: 'SF0',
    url: 'https://sf0.org',
    description:
      'The original collaborative art game that inspired World Zero. Created in San Francisco.',
  },
  {
    name: 'Caveat',
    url: 'https://fonts.google.com/specimen/Caveat',
    description: 'Display font used for headings. Available via Google Fonts.',
  },
  {
    name: 'Kalam',
    url: 'https://fonts.google.com/specimen/Kalam',
    description: 'Body font used throughout the interface. Available via Google Fonts.',
  },
  {
    name: 'React',
    url: 'https://react.dev',
    description: 'Frontend library powering the UI.',
  },
  {
    name: 'FastAPI',
    url: 'https://fastapi.tiangolo.com',
    description: 'Python web framework powering the backend API.',
  },
  {
    name: 'Tailwind CSS',
    url: 'https://tailwindcss.com',
    description: 'Utility-first CSS framework used for all styling.',
  },
  {
    name: 'SQLAlchemy',
    url: 'https://www.sqlalchemy.org',
    description: 'Async ORM used for database access in the backend.',
  },
  {
    name: 'Authlib',
    url: 'https://authlib.org',
    description: 'OAuth library used for Google authentication.',
  },
]

export default function Attributions() {
  const { t } = useTranslation('common')
  return (
    <div className="py-8 max-w-2xl">
      <PageTitle title={t('attributions.title')} />
      <p className="font-body text-muted mb-6">
        {t('attributions.intro')}
      </p>

      <div className="space-y-3">
        {attributions.map((item) => (
          <div key={item.name} className="card p-4">
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-display text-lg font-bold underline hover:text-muted"
            >
              {item.name}
            </a>
            <p className="font-body text-sm text-muted mt-1">{item.description}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
