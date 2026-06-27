import LegalPage from '@/components/marketing/LegalPage';
import { getLegalPage } from '@/lib/legalContent';

const page = getLegalPage('acceptable-use');

export default function AcceptableUse() {
  return <LegalPage slug="acceptable-use" title={page.title} lastUpdated={page.lastUpdated} intro={page.intro} sections={page.sections} />;
}