import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

/**
 * Shell chrome, bottom half: the in-flow footer links, on both form factors
 * (#3304). On a phone the fixed `MobileTabBar` sits over the bottom edge, so the
 * footer carries `--tab-bar-clearance` itself (the page region no longer does).
 *
 * Chrome only — see {@link MobileHeader} for why the shells no longer wrap the
 * page (#1116).
 */
export default function SiteFooter({ isMobile = false }: { isMobile?: boolean }) {
  const { t } = useTranslation('common')
  return (
    <footer
      className="relative site-footer font-body text-xs flex gap-6 flex-wrap max-w-5xl mx-auto w-full px-4 sm:px-6 py-4 mt-8"
      style={{
        color: 'var(--color-text-tertiary)',
        zIndex: 5,
        ...(isMobile && { paddingBottom: 'calc(var(--space-md) + var(--tab-bar-clearance) + (44px - 1lh) / 2)' }),
      }}
    >
      <Link to="/about" className="hit-y hit-pad hover:underline">{t('footer.about')}</Link>
      <Link to="/contact" className="hit-y hit-pad hover:underline">{t('footer.contact')}</Link>
      <Link to="/disclaimer" className="hit-y hit-pad hover:underline">{t('footer.disclaimer')}</Link>
      <Link to="/attributions" className="hit-y hit-pad hover:underline">{t('footer.attributions')}</Link>
      <Link to="/donate" className="hit-y hit-pad hover:underline">{t('footer.donate')}</Link>
    </footer>
  )
}
