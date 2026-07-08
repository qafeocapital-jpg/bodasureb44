import LegalPage from '@/components/marketing/LegalPage';
import { getLegalPage } from '@/lib/legalContent';

const page = getLegalPage('consumer-protection');

export default function ConsumerProtection() {
  return <LegalPage slug="consumer-protection" title={page.title} lastUpdated={page.lastUpdated} intro={page.intro} sections={page.sections} />;
}