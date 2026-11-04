export type Country = {
  code: string;
  name: string;
  currencyCode: string;
  currencyName: string;
  flag: string;
};

export const countries: Country[] = [
  {
    code: "MY",
    name: "Malaysia",
    currencyCode: "MYR",
    currencyName: "Malaysian Ringgit",
    flag: "🇲🇾",
  },
  {
    code: "ID",
    name: "Indonesia",
    currencyCode: "IDR",
    currencyName: "Indonesian Rupiah",
    flag: "🇮🇩",
  },
  {
    code: "SG",
    name: "Singapore",
    currencyCode: "SGD",
    currencyName: "Singapore Dollar",
    flag: "🇸🇬",
  },
  {
    code: "JP",
    name: "Japan",
    currencyCode: "JPY",
    currencyName: "Japanese Yen",
    flag: "🇯🇵",
  },
  {
    code: "HK",
    name: "Hong Kong",
    currencyCode: "HKD",
    currencyName: "Hong Kong Dollar",
    flag: "🇭🇰",
  },
  {
    code: "TH",
    name: "Thailand",
    currencyCode: "THB",
    currencyName: "Thai Baht",
    flag: "🇹🇭",
  },
  {
    code: "PH",
    name: "Philippines",
    currencyCode: "PHP",
    currencyName: "Philippine Peso",
    flag: "🇵🇭",
  },
  {
    code: "VN",
    name: "Vietnam",
    currencyCode: "VND",
    currencyName: "Vietnamese Dong",
    flag: "🇻🇳",
  },
  {
    code: "US",
    name: "United States",
    currencyCode: "USD",
    currencyName: "US Dollar",
    flag: "🇺🇸",
  },
  {
    code: "GB",
    name: "United Kingdom",
    currencyCode: "GBP",
    currencyName: "British Pound",
    flag: "🇬🇧",
  },
  {
    code: "AU",
    name: "Australia",
    currencyCode: "AUD",
    currencyName: "Australian Dollar",
    flag: "🇦🇺",
  },
  {
    code: "CA",
    name: "Canada",
    currencyCode: "CAD",
    currencyName: "Canadian Dollar",
    flag: "🇨🇦",
  },
  {
    code: "CN",
    name: "China",
    currencyCode: "CNY",
    currencyName: "Chinese Yuan",
    flag: "🇨🇳",
  },
  {
    code: "KR",
    name: "South Korea",
    currencyCode: "KRW",
    currencyName: "South Korean Won",
    flag: "🇰🇷",
  },
  {
    code: "IN",
    name: "India",
    currencyCode: "INR",
    currencyName: "Indian Rupee",
    flag: "🇮🇳",
  },
  {
    code: "DE",
    name: "Germany",
    currencyCode: "EUR",
    currencyName: "Euro",
    flag: "🇩🇪",
  },
  {
    code: "FR",
    name: "France",
    currencyCode: "EUR",
    currencyName: "Euro",
    flag: "🇫🇷",
  },
  {
    code: "IT",
    name: "Italy",
    currencyCode: "EUR",
    currencyName: "Euro",
    flag: "🇮🇹",
  },
  {
    code: "ES",
    name: "Spain",
    currencyCode: "EUR",
    currencyName: "Euro",
    flag: "🇪🇸",
  },
  {
    code: "NL",
    name: "Netherlands",
    currencyCode: "EUR",
    currencyName: "Euro",
    flag: "🇳🇱",
  },
];

export function getCountryByCode(code: string): Country | undefined {
  return countries.find((country) => country.code === code.toUpperCase());
}
