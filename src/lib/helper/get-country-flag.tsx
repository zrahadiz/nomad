import { getCountryByCode } from "@/constants/countries";

export function getCountryFlag(countryCode: string | null | undefined): string {
  return getCountryByCode(countryCode ?? "")?.flag ?? "🌍";
}
