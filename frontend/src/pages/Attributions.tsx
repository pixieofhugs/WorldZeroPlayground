import { useTranslation } from 'react-i18next'
import PageTitle from '../components/ui/PageTitle'
const attributions = [
  {
    name: 'SF0',
    url: 'https://sf0.org',
    description:
      'The original collaborative art game that inspired World Zero. Created in San Francisco.',
  },
  // The typefaces (#1977). Self-hosted, so the licences ship in
  // frontend/src/assets/fonts/licences/.
  {
    name: 'Archivo Black, Bebas Neue, Caveat, Cinzel, Cormorant Garamond, '
      + 'Courier Prime, EB Garamond, Grenze Gotisch, Lora, '
      + 'MedievalSharp, Permanent Marker, Poiret One, Quicksand, Share Tech Mono, '
      + 'Special Elite, Spectral',
    url: 'https://fonts.google.com',
    description:
      'The sixteen typefaces the faction kits are built on, from Google Fonts and '
      + 'self-hosted here. All are under the SIL Open Font License 1.1 except '
      + 'Permanent Marker and Special Elite, which are Apache 2.0; every licence '
      + 'ships with the fonts.',
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
  // The praxis room (ADR-0073). All MIT, including transitive lib0,
  // y-protocols and style-mod.
  {
    name: 'Yjs',
    url: 'https://yjs.dev',
    description:
      'CRDT library behind live co-editing of a praxis, with y-websocket and y-codemirror.next.',
  },
  {
    name: 'CodeMirror',
    url: 'https://codemirror.net',
    description: 'Plain-text editor the praxis write-up is composed in.',
  },
  {
    name: 'pycrdt',
    url: 'https://github.com/y-crdt/pycrdt',
    description: 'Python CRDT bindings holding the server side of a praxis room.',
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
            <p className="font-body content-text text-muted mt-1">{item.description}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
