import LegalPage from '@/components/marketing/LegalPage';
import { getLegalPage } from '@/lib/legalContent';

const page = getLegalPage('terms');

export default function Terms() {
  return <LegalPage slug="terms" title={page.title} lastUpdated={page.lastUpdated} intro={page.intro} sections={page.sections} />;
}