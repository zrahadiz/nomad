export type currencyRateSource = "manual" | "automatic";

export type workspaceCurrencyConverter = {
  id: string;
  workspaceId: string;
  targetCurrencyCode: string;
  exchangeRate: number;
  rateSource: currencyRateSource;
  lastUpdatedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type saveWorkspaceCurrencyConverterInput = {
  workspaceId: string;
  targetCurrencyCode: string;
  exchangeRate: number;
  rateSource: currencyRateSource;
};
