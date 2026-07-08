import LegalPage from '@/components/marketing/LegalPage';
import { getLegalPage } from '@/lib/legalContent';

const page = getLegalPage('refund-policy');

export default function RefundPolicy() {
  return <LegalPage slug="refund-policy" title={page.title} lastUpdated={page.lastUpdated} intro={page.intro} sections={page.sections} />;
}