import LegalPage from '@/components/marketing/LegalPage';
import { getLegalPage } from '@/lib/legalContent';

const page = getLegalPage('data-protection');

export default function DataProtection() {
  return <LegalPage slug="data-protection" title={page.title} lastUpdated={page.lastUpdated} intro={page.intro} sections={page.sections} />;
}