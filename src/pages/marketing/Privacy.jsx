import LegalPage from '@/components/marketing/LegalPage';
import { getLegalPage } from '@/lib/legalContent';

const page = getLegalPage('privacy');

export default function Privacy() {
  return <LegalPage slug="privacy" title={page.title} lastUpdated={page.lastUpdated} intro={page.intro} sections={page.sections} />;
}