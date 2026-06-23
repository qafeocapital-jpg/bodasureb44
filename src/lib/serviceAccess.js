/**
 * Service access rules — determines what features a rider can use
 * based on their onboarding state (PRD Section 9).
 *
 * Unlock matrix:
 * - Phone OTP (wallet active) → Home, basic browsing
 * - Name + county (profile complete) → Wallet deposit, Lipisha
 * - Vehicle registered → Lipa County
 * - KYC approved (Tier 2) → Lipa Owner, Send, Withdraw, Services
 */

export function checkServiceAccess(service, { user, wallet, bikes, countyLive }) {
  const walletActive = wallet?.status === 'active';
  const profileComplete = user?.profile_complete === true;
  const hasBike = bikes && bikes.length > 0;
  const kycApproved = user?.kyc_status === 'approved';
  const tier2 = (wallet?.tier || 0) >= 2 || (user?.wallet_tier || 0) >= 2;

  const services = {
    lipisha: {
      unlocked: walletActive,
      title: 'Activate Your Wallet',
      message: 'Activate your BodaSure Wallet to start collecting fares.',
      actionLabel: 'Activate Wallet',
      actionLink: '/app/wallet/activate',
    },
    lipa_owner: {
      unlocked: walletActive,
      title: 'Activate Your Wallet',
      message: 'Activate your wallet to pay bike owners.',
      actionLabel: 'Activate Wallet',
      actionLink: '/app/wallet/activate',
    },
    lipa_county: {
      unlocked: walletActive && hasBike,
      title: 'Register Your Bike',
      message: 'You need a registered and approved bike before paying county fees.',
      actionLabel: 'Register Bike',
      actionLink: '/app/bikes/register',
    },
    lipa_county_live: {
      unlocked: countyLive === true,
      title: 'County Not Live Yet',
      message: 'Your county has not activated BodaSure yet. We\'ll notify you when it goes live.',
      actionLabel: 'Go Back',
      actionLink: null,
    },
    services: {
      unlocked: walletActive && tier2,
      title: 'Tier 2 Required',
      message: 'Complete KYC verification (Tier 2) to access bill payments and services.',
      actionLabel: 'Verify Now',
      actionLink: '/app/kyc',
    },
    wallet_send: {
      unlocked: walletActive && tier2,
      title: 'Tier 2 Required',
      message: 'Complete KYC verification (Tier 2) to send money.',
      actionLabel: 'Verify Now',
      actionLink: '/app/kyc',
    },
    wallet_withdraw: {
      unlocked: walletActive && tier2,
      title: 'Tier 2 Required',
      message: 'Complete KYC verification (Tier 2) to withdraw funds.',
      actionLabel: 'Verify Now',
      actionLink: '/app/kyc',
    },
  };

  return services[service] || { unlocked: true };
}