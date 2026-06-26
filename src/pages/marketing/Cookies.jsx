import LegalPage from '@/components/marketing/LegalPage';

export default function Cookies() {
  return (
    <LegalPage
      title="Cookie Policy"
      lastUpdated="June 2025"
      intro="This Cookie Policy explains how BodaSure Technologies Ltd uses cookies and similar technologies on our website and mobile application."
      sections={[
        { heading: '1. What Are Cookies', body: 'Cookies are small text files placed on your device when you visit a website. They help the website remember your actions and preferences over time. We use cookies to improve your experience, analyze traffic, and ensure security.' },
        { heading: '2. Types of Cookies We Use', body: 'Essential Cookies: Required for the website to function correctly. These enable core features like authentication, security, and session management.\n\nAnalytics Cookies: Help us understand how visitors use our website so we can improve performance and user experience. We use anonymized, aggregated data.\n\nPreference Cookies: Remember your settings, such as language and display preferences, to provide a personalized experience.\n\nSecurity Cookies: Monitor for suspicious activity and help protect against fraud and unauthorized access.' },
        { heading: '3. Third-Party Cookies', body: 'We may use third-party services that set their own cookies, including:\n\nAnalytics providers to understand website usage.\n\nPayment providers for transaction security.\n\nIdentity verification providers for fraud prevention.\n\nThese third parties have their own privacy policies governing how they use cookies and data.' },
        { heading: '4. Managing Cookies', body: 'You can control and manage cookies through your browser settings. Most browsers allow you to:\n\nAccept or reject all cookies.\n\nAccept only essential cookies.\n\nDelete existing cookies.\n\nBlock cookies from specific websites.\n\nNote that disabling essential cookies may prevent you from using key features of our website, such as login and registration.' },
        { heading: '5. Updates', body: 'We may update this Cookie Policy from time to time. Changes will be posted on this page with an updated "Last updated" date.' },
        { heading: '6. Contact', body: 'For questions about our use of cookies, contact us at privacy@bodasure.co.ke.' },
      ]}
    />
  );
}