import LegalPage from '@/components/marketing/LegalPage';

export default function AcceptableUse() {
  return (
    <LegalPage
      title="Acceptable Use Policy"
      lastUpdated="June 2025"
      intro="This Acceptable Use Policy sets out the rules for using the BodaSure platform. By using BodaSure, you agree to follow these rules. Violation may result in account suspension, termination, and legal action."
      sections={[
        { heading: '1. Permitted Activities', body: 'You may use BodaSure for:\n\nRegistering as a BodaBoda rider, SACCO member, or county official.\n\nCompleting identity and vehicle verification.\n\nUsing the BodaSure Wallet for legitimate transactions, including fare collection, county fee payments, and P2P transfers.\n\nAccessing financial services (insurance, loans, investments) through our partner providers.\n\nParticipating in SACCO and chama activities.\n\nAll activities must be lawful and conducted in good faith.' },
        { heading: '2. Prohibited Activities', body: 'You must not:\n\nUse BodaSure for money laundering, terrorism financing, or any illegal activity.\n\nProvide false, inaccurate, or misleading information during registration or verification.\n\nUse another person\'s identity, ID, or wallet without authorization.\n\nRegister a motorcycle that you do not own or have authorization to operate.\n\nCreate fake or duplicate accounts.\n\nAttempt to bypass or circumvent identity verification, transaction limits, or security controls.\n\nUse the platform for gambling, betting, or pyramid schemes.\n\nHarass, threaten, or defame other users.\n\nSend unsolicited messages or spam.\n\nReverse engineer, hack, or attempt to access the platform\'s source code or infrastructure.\n\nResell or commercialize your BodaSure account without authorization.' },
        { heading: '3. Content Standards', body: 'When posting content on BodaSure (e.g., profile photos, bike photos, dispute descriptions):\n\nContent must be accurate and truthful.\n\nContent must not be defamatory, obscene, or offensive.\n\nContent must not infringe on intellectual property rights.\n\nContent must not contain personal information of third parties without consent.\n\nWe reserve the right to remove any content that violates these standards.' },
        { heading: '4. Enforcement', body: 'Violations of this Acceptable Use Policy may result in:\n\nWarning and requirement to correct the violation.\n\nTemporary suspension of account access.\n\nPermanent account termination.\n\nReporting to law enforcement or regulatory authorities.\n\nRecovery of financial losses caused by the violation.\n\nWe use automated systems and manual review to detect violations. Account actions can be appealed by contacting support@bodasure.co.ke.' },
        { heading: '5. Changes', body: 'We may update this Acceptable Use Policy from time to time. Changes will be posted on this page with an updated "Last updated" date.' },
        { heading: '6. Contact', body: 'For questions about this policy, contact us at legal@bodasure.co.ke.' },
      ]}
    />
  );
}