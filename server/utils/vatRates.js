// VAT rates for EU countries as of 2024
const EU_VAT_RATES = {
  AT: 20, // Austria
  BE: 21, // Belgium
  BG: 20, // Bulgaria
  HR: 25, // Croatia
  CZ: 21, // Czech Republic
  DK: 25, // Denmark
  EE: 22, // Estonia
  FI: 24, // Finland
  FR: 20, // France
  DE: 19, // Germany
  GR: 24, // Greece
  HU: 27, // Hungary
  IE: 23, // Ireland
  IT: 22, // Italy
  LV: 21, // Latvia
  LT: 21, // Lithuania
  LU: 17, // Luxembourg
  MT: 18, // Malta
  NL: 21, // Netherlands
  PL: 23, // Poland
  PT: 23, // Portugal
  RO: 19, // Romania
  SK: 20, // Slovakia
  SI: 22, // Slovenia
  ES: 21, // Spain
  SE: 25, // Sweden
  CY: 19, // Cyprus
};

// Default rate for non-EU countries
const NON_EU_VAT_RATE = 0;

/**
 * Get the VAT rate for a given country code
 * @param {string} countryCode - Two-letter ISO country code
 * @returns {number} The VAT rate as a percentage (0-100)
 */
const getVatRateForCountry = (countryCode) => {
  if (!countryCode) return NON_EU_VAT_RATE;

  // Normalize country code to uppercase
  const normalizedCode = countryCode.toUpperCase();

  // Return the VAT rate for EU countries, or 0 for non-EU countries
  return EU_VAT_RATES[normalizedCode] || NON_EU_VAT_RATE;
};

module.exports = {
  getVatRateForCountry,
  EU_VAT_RATES,
  NON_EU_VAT_RATE,
};
