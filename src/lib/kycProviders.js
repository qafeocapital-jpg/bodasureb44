// KYC Provider Abstraction Layer
// Allows swapping between manual review and automated providers (IDAnalyzer)

export const KYC_PROVIDERS = {
  MANUAL: 'manual_review',
  ID_ANALYZER: 'id_analyzer',
};

export const PROVIDER_CONFIGS = {
  [KYC_PROVIDERS.MANUAL]: {
    name: 'Manual Review',
    description: 'Documents reviewed manually by compliance staff',
    automated: false,
  },
  [KYC_PROVIDERS.ID_ANALYZER]: {
    name: 'ID Analyzer',
    description: 'Automated document verification via ID Analyzer API',
    automated: true,
  },
};

// Determine if a provider is automated
export function isAutomatedProvider(provider) {
  return PROVIDER_CONFIGS[provider]?.automated === true;
}