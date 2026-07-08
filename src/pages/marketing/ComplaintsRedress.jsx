import LegalPage from '@/components/marketing/LegalPage';
import { getLegalPage } from '@/lib/legalContent';

const page = getLegalPage('complaints-redress');

export default function ComplaintsRedress() {
  return <LegalPage slug="complaints-redress" title={page.title} lastUpdated={page.lastUpdated} intro={page.intro} sections={page.sections} />;
}