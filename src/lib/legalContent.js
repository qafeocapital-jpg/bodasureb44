// Central registry of legal/policy page content.
// Used by both the admin WYSIWYG editor (pre-fill) and public LegalPage (fallback).

export const LEGAL_PAGES = [
  {
    slug: 'privacy',
    title: 'Privacy Policy',
    lastUpdated: 'June 2025',
    intro: 'BodaSure Technologies Ltd ("BodaSure", "we", "us") is committed to protecting the privacy and personal data of all users of our platform. This Privacy Policy explains how we collect, use, store, and share your personal information in accordance with the Kenya Data Protection Act, 2019.',
    sections: [
      { heading: '1. Information We Collect', body: 'We collect the following types of personal information:\n\nIdentity Information: Full name, national ID number, date of birth, gender, and ID photo.\n\nContact Information: Phone number, email address, and physical address.\n\nVehicle Information: Motorcycle plate number, logbook details, and owner information.\n\nFinancial Information: Wallet transaction history, payment details, and bank account information.\n\nBiometric Data: Selfie photos for identity verification and facial recognition.\n\nUsage Data: Device information, IP address, app usage patterns, and location data.' },
      { heading: '2. How We Use Your Information', body: 'We use your personal information for the following purposes:\n\nTo verify your identity and prevent fraud.\n\nTo create and manage your BodaSure Wallet and process transactions.\n\nTo issue digital permits and compliance certificates.\n\nTo comply with legal and regulatory requirements, including AML/KYC obligations.\n\nTo provide customer support and resolve disputes.\n\nTo improve our services and develop new features.\n\nTo send you important notifications about your account, transactions, and regulatory updates.' },
      { heading: '3. Data Storage & Security', body: 'Your personal data is stored on secure, cloud-hosted infrastructure with AES-256 encryption at rest and TLS 1.3 in transit. Access to personal data is strictly controlled and logged. We retain personal data for the duration of your account and for the period required by law (typically 7 years for financial records).\n\nBiometric data used for identity verification is processed by our verified third-party provider (IDAnalyzer) and is not stored on our servers beyond the verification result.' },
      { heading: '4. Data Sharing', body: 'We may share your personal information with:\n\nCounty Governments — for registration, compliance, and revenue collection purposes.\n\nSACCOs and Welfare Groups — for membership management, with your consent.\n\nRegulatory Authorities — including the Central Bank of Kenya, NTSA, and the Office of the Data Protection Commissioner, when legally required.\n\nThird-party Service Providers — including licensed payment processors, SMS providers, and identity verification providers, under strict data protection agreements.\n\nWe never sell your personal data to third parties.' },
      { heading: '5. Your Rights', body: 'Under the Kenya Data Protection Act 2019, you have the right to:\n\nAccess: Request a copy of the personal data we hold about you.\n\nRectification: Request correction of inaccurate or incomplete data.\n\nErasure: Request deletion of your personal data, subject to legal retention requirements.\n\nObjection: Object to the processing of your data for specific purposes.\n\nData Portability: Receive your data in a structured, machine-readable format.\n\nTo exercise any of these rights, contact us at help@bodasure.com.' },
      { heading: '6. Cookies', body: 'Our website uses cookies to improve user experience, analyze traffic, and provide security. See our Cookie Policy for details on the types of cookies we use and how to manage them.' },
      { heading: '7. Changes to This Policy', body: 'We may update this Privacy Policy from time to time. We will notify you of any material changes via SMS or email. The latest version is always available on our website.' },
      { heading: '8. Contact', body: 'If you have any questions about this Privacy Policy or how we handle your data, contact our Data Protection Officer at help@bodasure.com or write to us at Trance Towers, Mombasa Road, Nairobi, Kenya.' },
    ],
  },
  {
    slug: 'terms',
    title: 'Terms of Service',
    lastUpdated: 'June 2025',
    intro: 'These Terms of Service ("Terms") govern your use of the BodaSure platform, including our website, mobile application, and all related services. By creating an account or using BodaSure, you agree to these Terms.',
    sections: [
      { heading: '1. Eligibility', body: 'You must be at least 18 years old and a resident of Kenya to use BodaSure. By registering, you confirm that you are legally eligible to use our services and that all information provided is accurate and truthful.' },
      { heading: '2. Account Registration', body: 'To use BodaSure, you must complete the registration process, including:\n\nProviding accurate personal information (name, national ID, phone number).\n\nCompleting identity verification via IDAnalyzer.\n\nCompleting bike and ownership verification (for riders).\n\nSetting up a wallet PIN.\n\nYou are responsible for maintaining the confidentiality of your account credentials and PIN. Notify us immediately of any unauthorized access.' },
      { heading: '3. BodaSure Wallet', body: 'The BodaSure Wallet is a digital wallet powered by our licensed payment partner. By using the wallet, you agree to:\n\nMaintain sufficient funds for all transactions.\n\nNot use the wallet for illegal or fraudulent activities.\n\nAuthorize us to deduct applicable fees from your wallet for transactions.\n\nWallet balances are held by our licensed payment partner. BodaSure does not hold customer funds directly.\n\nWallet limits and fees are published on our Pricing page and may be updated from time to time.' },
      { heading: '4. Permitted Use', body: 'You agree to use BodaSure only for lawful purposes. You must not:\n\nUse the platform for money laundering, fraud, or any illegal activity.\n\nAttempt to bypass identity verification or provide false information.\n\nUse another person\'s identity, vehicle, or wallet without authorization.\n\nReverse engineer, decompile, or attempt to access the source code of the platform.\n\nSpam, harass, or harm other users.\n\nViolation of these terms may result in immediate account suspension and legal action.' },
      { heading: '5. Fees & Charges', body: 'BodaSure charges transaction fees for certain services, including:\n\nCounty fee payments (lipa county).\n\nOwner payments (lipa owner).\n\nFare collection (lipisha).\n\nP2P transfers.\n\nAll fees are transparently displayed before each transaction. Fee structures may be updated with 30 days notice.\n\nPremium rider features (loans, investments, health cover) are available at KES 99/month.' },
      { heading: '6. Liability', body: 'BodaSure provides the platform as a service. We are not liable for:\n\nDisputes between riders and motorcycle owners.\n\nDisputes between riders and passengers.\n\nCounty permit or compliance decisions.\n\nLoan or insurance decisions made by third-party providers.\n\nOur liability is limited to the transaction fees collected for the specific service in question.\n\nWe are not liable for indirect, incidental, or consequential damages.' },
      { heading: '7. Dispute Resolution', body: 'Any disputes arising from these Terms or your use of BodaSure shall be resolved through:\n\nFirst, contacting our support team for resolution.\n\nSecond, mediation through a mutually agreed mediator in Nairobi, Kenya.\n\nFinally, arbitration under the Arbitration Act of Kenya, with Nairobi as the seat of arbitration.\n\nThese Terms are governed by the laws of the Republic of Kenya.' },
      { heading: '8. Account Suspension & Termination', body: 'We reserve the right to suspend or terminate your account if you violate these Terms, engage in fraudulent activity, or if required by law or regulatory authorities. You may close your account at any time by contacting support. Outstanding wallet balances will be settled within 14 days of account closure.' },
      { heading: '9. Changes to Terms', body: 'We may update these Terms from time to time. Material changes will be communicated via SMS or email at least 30 days before they take effect. Continued use of BodaSure after changes take effect constitutes acceptance of the updated Terms.' },
      { heading: '10. Contact', body: 'For questions about these Terms, contact us at help@bodasure.com.' },
    ],
  },
  {
    slug: 'cookies',
    title: 'Cookie Policy',
    lastUpdated: 'June 2025',
    intro: 'This Cookie Policy explains how BodaSure Technologies Ltd uses cookies and similar technologies on our website and mobile application.',
    sections: [
      { heading: '1. What Are Cookies', body: 'Cookies are small text files placed on your device when you visit a website. They help the website remember your actions and preferences over time. We use cookies to improve your experience, analyze traffic, and ensure security.' },
      { heading: '2. Types of Cookies We Use', body: 'Essential Cookies: Required for the website to function correctly. These enable core features like authentication, security, and session management.\n\nAnalytics Cookies: Help us understand how visitors use our website so we can improve performance and user experience. We use anonymized, aggregated data.\n\nPreference Cookies: Remember your settings, such as language and display preferences, to provide a personalized experience.\n\nSecurity Cookies: Monitor for suspicious activity and help protect against fraud and unauthorized access.' },
      { heading: '3. Third-Party Cookies', body: 'We may use third-party services that set their own cookies, including:\n\nAnalytics providers to understand website usage.\n\nPayment providers for transaction security.\n\nIdentity verification providers for fraud prevention.\n\nThese third parties have their own privacy policies governing how they use cookies and data.' },
      { heading: '4. Managing Cookies', body: 'You can control and manage cookies through your browser settings. Most browsers allow you to:\n\nAccept or reject all cookies.\n\nAccept only essential cookies.\n\nDelete existing cookies.\n\nBlock cookies from specific websites.\n\nNote that disabling essential cookies may prevent you from using key features of our website, such as login and registration.' },
      { heading: '5. Updates', body: 'We may update this Cookie Policy from time to time. Changes will be posted on this page with an updated "Last updated" date.' },
      { heading: '6. Contact', body: 'For questions about our use of cookies, contact us at help@bodasure.com.' },
    ],
  },
  {
    slug: 'aml',
    title: 'AML / KYC Policy',
    lastUpdated: 'June 2025',
    intro: 'BodaSure Technologies Ltd is committed to preventing money laundering, terrorist financing, and financial crime. This Anti-Money Laundering (AML) and Know Your Customer (KYC) Policy outlines the procedures we follow to comply with Kenyan financial regulations, including the Proceeds of Crime and Anti-Money Laundering Act and Central Bank of Kenya (CBK) guidelines.',
    sections: [
      { heading: '1. Identity Verification (KYC)', body: 'All BodaSure users must complete identity verification before accessing wallet services. This includes:\n\nNational ID verification: Users must upload their national ID (front and back) for AI-powered verification via IDAnalyzer.\n\nSelfie verification: A live selfie is compared against the ID photo using facial recognition technology.\n\nBiometric liveness check: Ensures the user is physically present during verification.\n\nSanctions screening: User details are screened against international sanctions lists.\n\nFor SACCOs and county government accounts, enhanced due diligence is performed, including verification of business registration, director identities, and beneficial ownership.' },
      { heading: '2. Transaction Monitoring', body: 'BodaSure monitors all wallet transactions for suspicious activity, including:\n\nUnusually large transactions that are inconsistent with a user\'s profile.\n\nRapid movement of funds between accounts (structuring/smurfing patterns).\n\nTransactions involving high-risk jurisdictions.\n\nMultiple failed or reversed transactions.\n\nTransactions flagged by our automated risk scoring system.\n\nSuspicious transactions are reviewed by our compliance team and may be reported to the Financial Reporting Centre (FRC) of Kenya.' },
      { heading: '3. Reporting Obligations', body: 'Under Kenyan law, BodaSure is required to report:\n\nSuspicious Transaction Reports (STRs) to the Financial Reporting Centre within 7 days of detection.\n\nCash Transaction Reports (CTRs) for transactions above the statutory threshold.\n\nTerrorist Property Reports if we identify any property owned or controlled by a terrorist entity.\n\nWe are prohibited from tipping off any person who is the subject of a suspicious transaction report.' },
      { heading: '4. Risk Assessment', body: 'BodaSure conducts periodic risk assessments to identify and mitigate money laundering and terrorist financing risks. Risk factors include:\n\nCustomer risk (e.g., PEPs, high-risk occupations).\n\nGeographic risk (e.g., high-risk jurisdictions).\n\nProduct risk (e.g., anonymous transactions, cross-border transfers).\n\nTransaction risk (e.g., large cash transactions, rapid fund movement).\n\nUsers are assigned a risk rating that determines the level of due diligence and monitoring applied to their account.' },
      { heading: '5. Record Keeping', body: 'BodaSure maintains records of all identity verification documents, transaction records, and compliance reports for a minimum of 7 years, as required by Kenyan law. Records are stored securely and are available to regulatory authorities upon request.' },
      { heading: '6. Employee Training', body: 'All BodaSure employees receive regular AML/KYC training to ensure they understand their obligations and can identify suspicious activity. Training covers:\n\nKenyan AML laws and regulations.\n\nIdentifying red flags and suspicious patterns.\n\nProcedures for reporting suspicious activity.\n\nSanctions screening and PEP identification.' },
      { heading: '7. Compliance Officer', body: 'BodaSure has appointed a designated Compliance Officer responsible for overseeing the AML/KYC program. The Compliance Officer reports to senior management and regulatory authorities as required.\n\nFor AML/KYC inquiries, contact: help@bodasure.com' },
    ],
  },
  {
    slug: 'acceptable-use',
    title: 'Acceptable Use Policy',
    lastUpdated: 'June 2025',
    intro: 'This Acceptable Use Policy sets out the rules for using the BodaSure platform. By using BodaSure, you agree to follow these rules. Violation may result in account suspension, termination, and legal action.',
    sections: [
      { heading: '1. Permitted Activities', body: 'You may use BodaSure for:\n\nRegistering as a BodaBoda rider, SACCO member, or county official.\n\nCompleting identity and vehicle verification.\n\nUsing the BodaSure Wallet for legitimate transactions, including fare collection, county fee payments, and P2P transfers.\n\nAccessing financial services (insurance, loans, investments) through our partner providers.\n\nParticipating in SACCO and chama activities.\n\nAll activities must be lawful and conducted in good faith.' },
      { heading: '2. Prohibited Activities', body: 'You must not:\n\nUse BodaSure for money laundering, terrorism financing, or any illegal activity.\n\nProvide false, inaccurate, or misleading information during registration or verification.\n\nUse another person\'s identity, ID, or wallet without authorization.\n\nRegister a motorcycle that you do not own or have authorization to operate.\n\nCreate fake or duplicate accounts.\n\nAttempt to bypass or circumvent identity verification, transaction limits, or security controls.\n\nUse the platform for gambling, betting, or pyramid schemes.\n\nHarass, threaten, or defame other users.\n\nSend unsolicited messages or spam.\n\nReverse engineer, hack, or attempt to access the platform\'s source code or infrastructure.\n\nResell or commercialize your BodaSure account without authorization.' },
      { heading: '3. Content Standards', body: 'When posting content on BodaSure (e.g., profile photos, bike photos, dispute descriptions):\n\nContent must be accurate and truthful.\n\nContent must not be defamatory, obscene, or offensive.\n\nContent must not infringe on intellectual property rights.\n\nContent must not contain personal information of third parties without consent.\n\nWe reserve the right to remove any content that violates these standards.' },
      { heading: '4. Enforcement', body: 'Violations of this Acceptable Use Policy may result in:\n\nWarning and requirement to correct the violation.\n\nTemporary suspension of account access.\n\nPermanent account termination.\n\nReporting to law enforcement or regulatory authorities.\n\nRecovery of financial losses caused by the violation.\n\nWe use automated systems and manual review to detect violations. Account actions can be appealed by contacting help@bodasure.com.' },
      { heading: '5. Changes', body: 'We may update this Acceptable Use Policy from time to time. Changes will be posted on this page with an updated "Last updated" date.' },
      { heading: '6. Contact', body: 'For questions about this policy, contact us at help@bodasure.com.' },
    ],
  },
];

function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Convert the structured fallback content into HTML for the WYSIWYG editor pre-fill.
export function sectionsToHtml(page) {
  if (!page) return '';
  let html = '';
  if (page.intro) {
    html += `<p>${escapeHtml(page.intro)}</p>`;
  }
  for (const section of page.sections || []) {
    html += `<h2>${escapeHtml(section.heading)}</h2>`;
    if (typeof section.body === 'string') {
      for (const para of section.body.split('\n\n')) {
        html += `<p>${escapeHtml(para)}</p>`;
      }
    }
  }
  return html;
}

export function getLegalPage(slug) {
  return LEGAL_PAGES.find(p => p.slug === slug);
}