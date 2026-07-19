export interface CountryConfig {
  name: string;
  code: string;
  phoneCode: string;
  regions: string[];
}

export const COUNTRY_CONFIGS: Record<string, CountryConfig> = {
  IQ: {
    name: "Iraq",
    code: "IQ",
    phoneCode: "+964",
    regions: [
      "Baghdad",
      "Basra",
      "Erbil",
      "Mosul",
      "Sulaymaniyah",
      "Kirkuk",
      "Karbala",
      "Najaf",
      "Anbar",
      "Babil",
      "Dhi Qar",
      "Maysan",
      "Al-Qadisiyah",
      "Diyala",
      "Wasit",
      "Muthanna",
      "Salah Al-Din",
      "Duhok",
    ],
  },
};

export function getManualCountryOverride(): string | null {
  return "IQ";
}

export function setManualCountryOverride(code: string | null): void {}

export async function detectCountryCode(): Promise<string> {
  return "IQ";
}

export async function getActiveCountryConfig(): Promise<CountryConfig> {
  return COUNTRY_CONFIGS.IQ;
}
