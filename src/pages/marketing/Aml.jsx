import LegalPage from '@/components/marketing/LegalPage';
import { getLegalPage } from '@/lib/legalContent';

const page = getLegalPage('aml');

export default function Aml() {
  return <LegalPage slug="aml" title={page.title} lastUpdated={page.lastUpdated} intro={page.intro} sections={page.sections} />;
}