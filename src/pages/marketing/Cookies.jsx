import LegalPage from '@/components/marketing/LegalPage';
import { getLegalPage } from '@/lib/legalContent';

const page = getLegalPage('cookies');

export default function Cookies() {
  return <LegalPage slug="cookies" title={page.title} lastUpdated={page.lastUpdated} intro={page.intro} sections={page.sections} />;
}