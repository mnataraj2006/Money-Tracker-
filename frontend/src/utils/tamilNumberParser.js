/**
 * Comprehensive Tamil and English Spoken Number Parser for Cashly
 * Converts spoken Tamil/English numbers, compound phrases, digits + multipliers,
 * and handles boundary whitespace normalization.
 */

// 1. Basic Units (0 - 9)
export const TAMIL_UNITS_MAP = {
  'பூஜ்யம்': 0, 'சுழியம்': 0,
  'ஒன்று': 1, 'ஒன்னு': 1, 'ஒரு': 1, 'ஒன்னா': 1,
  'இரண்டு': 2, 'ரெண்டு': 2, 'இரண்டுமா': 2,
  'மூன்று': 3, 'மூனு': 3, 'மூனா': 3,
  'நான்கு': 4, 'நாளு': 4, 'நாலா': 4,
  'ஐந்து': 5, 'அஞ்சு': 5, 'அஞ்சா': 5,
  'ஆறு': 6, 'ஆறா': 6,
  'ஏழு': 7, 'ஏழா': 7,
  'எட்டு': 8, 'எட்டா': 8,
  'ஒன்பது': 9, 'ஒன்பதா': 9
};

// 2. Teens (10 - 19)
export const TAMIL_TEENS_MAP = {
  'பத்து': 10, 'பத்தா': 10,
  'பதினொன்று': 11, 'பதினோரு': 11, 'பதினொன்னு': 11,
  'பன்னிரண்டு': 12, 'பனிரெண்டு': 12, 'பன்னிரெண்டு': 12,
  'பதின்மூன்று': 13, 'பதினோமூன்று': 13,
  'பதினான்கு': 14,
  'பதினைந்து': 15, 'பதினஞ்சு': 15,
  'பதினாறு': 16,
  'பதினேழு': 17,
  'பதினெட்டு': 18,
  'பத்தொன்பது': 19
};

// 3. Tens (20 - 90)
export const TAMIL_TENS_MAP = {
  'இருபது': 20, 'இருபதா': 20,
  'முப்பது': 30, 'முப்பதா': 30,
  'நாற்பது': 40, 'நாற்பதா': 40,
  'ஐம்பது': 50, 'ஐம்பதா': 50,
  'அறுபது': 60, 'அறுபதா': 60,
  'எழுபது': 70, 'எழுபதா': 70,
  'எண்பது': 80, 'எண்பதா': 80,
  'தொண்ணூறு': 90, 'தொண்ணூறா': 90
};

// 4. Tens Prefixes (e.g., இருபத்து ஐந்து = 25)
export const TAMIL_TENS_PREFIX_MAP = {
  'இருபத்து': 20,
  'முப்பத்து': 30,
  'நாற்பத்து': 40,
  'ஐம்பத்து': 50,
  'அறுபத்து': 60,
  'எழுபத்து': 70,
  'எண்பத்து': 80,
  'தொண்ணூற்று': 90
};

// 5. Hundreds (100 - 900)
export const TAMIL_HUNDREDS_MAP = {
  'ஐந்நூறு': 500, 'ஐநூறு': 500, 'அஞ்சுநூறு': 500,
  'இருநூறு': 200, 'ரெண்டுநூறு': 200,
  'முந்நூறு': 300,
  'நானூறு': 400,
  'அறுநூறு': 600,
  'எழுநூறு': 700,
  'எண்ணூறு': 800,
  'தொள்ளாயிரம்': 900,
  'நூறு': 100, 'நூறா': 100
};

// 6. Hundreds Prefixes (e.g., நூற்றி ஐம்பது = 150)
export const TAMIL_HUNDREDS_PREFIX_MAP = {
  'ஐந்நூற்று': 500, 'ஐநூற்று': 500,
  'இருநூற்று': 200,
  'முந்நூற்று': 300,
  'நானூற்று': 400,
  'அறுநூற்று': 600,
  'எழுநூற்று': 700,
  'எண்ணூற்று': 800,
  'தொள்ளாயிரத்து': 900,
  'நூற்றி': 100
};

// 7. Thousands (1000 - 100000)
export const TAMIL_THOUSANDS_MAP = {
  'இருபத்தைந்தாயிரம்': 25000,
  'இருபதாயிரம்': 20000,
  'பதினைந்தாயிரம்': 15000,
  'ஐம்பதாயிரம்': 50000,
  'பத்தாயிரம்': 10000,
  'ஒன்பதாயிரம்': 9000,
  'எட்டாயிரம்': 8000,
  'ஏழாயிரம்': 7000,
  'ஆறாயிரம்': 6000,
  'ஐந்தாயிரம்': 5000, 'ஐயாயிரம்': 5000, 'அஞ்சாயிரம்': 5000,
  'நான்காயிரம்': 4000,
  'மூன்றாயிரம்': 3000,
  'இரண்டாயிரம்': 2000, 'ரெண்டாயிரம்': 2000,
  'ஆயிரம்': 1000
};

// 8. Thousands Prefixes (e.g., ஆயிரத்து ஐநூறு = 1500)
export const TAMIL_THOUSANDS_PREFIX_MAP = {
  'ஐந்தாயிரத்து': 5000, 'ஐயாயிரத்து': 5000,
  'பத்தாயிரத்து': 10000,
  'நான்காயிரத்து': 4000,
  'மூன்றாயிரத்து': 3000,
  'இரண்டாயிரத்து': 2000, 'ரெண்டாயிரத்து': 2000,
  'ஆயிரத்து': 1000
};

// 9. Lakhs (1,00,000 - 1,00,00,000)
export const TAMIL_LAKHS_MAP = {
  'ஒரு லட்சம்': 100000, 'லட்சம்': 100000, 'லக்ஷம்': 100000,
  'இரண்டு லட்சம்': 200000, 'ரெண்டு லட்சம்': 200000,
  'மூன்று லட்சம்': 300000,
  'நான்கு லட்சம்': 400000,
  'ஐந்து லட்சம்': 500000, 'அஞ்சு லட்சம்': 500000,
  'பத்து லட்சம்': 1000000,
  'இருபது லட்சம்': 2000000,
  'ஐம்பது லட்சம்': 5000000,
  'ஒரு கோடி': 10000000, 'கோடி': 10000000
};

// Spoken English Number Words
export const ENGLISH_NUMBER_WORDS_MAP = {
  'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
  'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
  'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15,
  'sixteen': 16, 'seventeen': 17, 'eighteen': 18, 'nineteen': 19,
  'twenty': 20, 'thirty': 30, 'forty': 40, 'fifty': 50,
  'sixty': 60, 'seventy': 70, 'eighty': 80, 'ninety': 90,
  'hundred': 100, 'thousand': 1000, 'lakh': 100000, 'lakhs': 100000, 'crore': 10000000
};

// Combined dictionary sorted in descending length to avoid substring collisions
const ALL_TAMIL_NUMBERS_SORTED = [
  ...Object.entries(TAMIL_LAKHS_MAP),
  ...Object.entries(TAMIL_THOUSANDS_PREFIX_MAP),
  ...Object.entries(TAMIL_THOUSANDS_MAP),
  ...Object.entries(TAMIL_HUNDREDS_PREFIX_MAP),
  ...Object.entries(TAMIL_HUNDREDS_MAP),
  ...Object.entries(TAMIL_TENS_PREFIX_MAP),
  ...Object.entries(TAMIL_TEENS_MAP),
  ...Object.entries(TAMIL_TENS_MAP),
  ...Object.entries(TAMIL_UNITS_MAP)
].sort((a, b) => b[0].length - a[0].length);

/**
 * Normalizes speech transcript whitespace and concatenations:
 * e.g. "ரவி20 ஆயிரம்" -> "ரவி 20 ஆயிரம்"
 *      "ரவி20ஆயிரம்"  -> "ரவி 20 ஆயிரம்"
 *      "ரவி20000"     -> "ரவி 20000"
 *      "20ஆயிரம்"     -> "20 ஆயிரம்"
 *      "2லட்சம்"      -> "2 லட்சம்"
 */
export function normalizeBoundaryWhitespace(text = '') {
  if (!text || typeof text !== 'string') return '';

  return text
    // Separate Tamil/English text from adjacent digits (e.g. "ரவி20" -> "ரவி 20", "ravi20" -> "ravi 20")
    .replace(/([\u0B80-\u0BFFa-zA-Z])(\d)/g, '$1 $2')
    // Separate digits from adjacent Tamil/English text (e.g. "20ஆயிரம்" -> "20 ஆயிரம்", "20thousand" -> "20 thousand")
    .replace(/(\d)([\u0B80-\u0BFFa-zA-Z])/g, '$1 $2')
    // Clean multiple spaces
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Pre-normalizes multi-word spoken numbers into compound tokens:
 * e.g. "ஐந்து ஆயிரம்" -> "ஐந்தாயிரம்"
 *      "இருபது ஆயிரம்" -> "இருபதாயிரம்"
 *      "ஐந்து நூறு" -> "ஐந்நூறு"
 *      "five thousand" -> "5000"
 *      "two lakh" -> "200000"
 */
export function preNormalizeSpokenNumbers(text = '') {
  if (!text || typeof text !== 'string') return '';

  let normalized = normalizeBoundaryWhitespace(text)
    // Spaced Tamil Thousands
    .replace(/(?:ஒன்று|ஒன்னு|ஒரு)\s+ஆயிரம்/gi, 'ஆயிரம்')
    .replace(/(?:இரண்டு|ரெண்டு)\s+ஆயிரம்/gi, 'இரண்டாயிரம்')
    .replace(/(?:மூன்று|மூனு)\s+ஆயிரம்/gi, 'மூன்றாயிரம்')
    .replace(/(?:நான்கு|நாளு)\s+ஆயிரம்/gi, 'நான்காயிரம்')
    .replace(/(?:ஐந்து|அஞ்சு)\s+ஆயிரம்/gi, 'ஐந்தாயிரம்')
    .replace(/ஆறு\s+ஆயிரம்/gi, 'ஆறாயிரம்')
    .replace(/ஏழு\s+ஆயிரம்/gi, 'ஏழாயிரம்')
    .replace(/எட்டு\s+ஆயிரம்/gi, 'எட்டாயிரம்')
    .replace(/ஒன்பது\s+ஆயிரம்/gi, 'ஒன்பதாயிரம்')
    .replace(/பத்து\s+ஆயிரம்/gi, 'பத்தாயிரம்')
    .replace(/பதினைந்து\s+ஆயிரம்/gi, 'பதினைந்தாயிரம்')
    .replace(/இருபது\s+ஆயிரம்/gi, 'இருபதாயிரம்')
    .replace(/இருபத்து\s*ஐந்து\s*ஆயிரம்/gi, 'இருபத்தைந்தாயிரம்')
    .replace(/முப்பது\s+ஆயிரம்/gi, '30000')
    .replace(/நாற்பது\s+ஆயிரம்/gi, '40000')
    .replace(/ஐம்பது\s+ஆயிரம்/gi, 'ஐம்பதாயிரம்')

    // Spaced Tamil Hundreds
    .replace(/(?:ஒன்று|ஒன்னு|ஒரு)\s+நூறு/gi, 'நூறு')
    .replace(/(?:இரண்டு|ரெண்டு)\s+நூறு/gi, 'இருநூறு')
    .replace(/(?:மூன்று|மூனு)\s+நூறு/gi, 'முந்நூறு')
    .replace(/(?:நான்கு|நாளு)\s+நூறு/gi, 'நானூறு')
    .replace(/(?:ஐந்து|அஞ்சு)\s+நூறு/gi, 'ஐந்நூறு')
    .replace(/ஆறு\s+நூறு/gi, 'அறுநூறு')
    .replace(/ஏழு\s+நூறு/gi, 'எழுநூறு')
    .replace(/எட்டு\s+நூறு/gi, 'எண்ணூறு')
    .replace(/ஒன்பது\s+நூறு/gi, 'தொள்ளாயிரம்')

    // Spaced English Multipliers
    .replace(/\bone\s+thousand\b/gi, '1000')
    .replace(/\btwo\s+thousand\b/gi, '2000')
    .replace(/\bthree\s+thousand\b/gi, '3000')
    .replace(/\bfour\s+thousand\b/gi, '4000')
    .replace(/\bfive\s+thousand\b/gi, '5000')
    .replace(/\bsix\s+thousand\b/gi, '6000')
    .replace(/\bseven\s+thousand\b/gi, '7000')
    .replace(/\beight\s+thousand\b/gi, '8000')
    .replace(/\bnine\s+thousand\b/gi, '9000')
    .replace(/\bten\s+thousand\b/gi, '10000')
    .replace(/\btwenty\s+thousand\b/gi, '20000')
    .replace(/\bfifty\s+thousand\b/gi, '50000')
    .replace(/\bone\s+lakh\b/gi, '100000')
    .replace(/\btwo\s+lakhs?\b/gi, '200000')
    .replace(/\bfive\s+lakhs?\b/gi, '500000')
    .replace(/\bten\s+lakhs?\b/gi, '1000000')
    .replace(/\bone\s+hundred\b/gi, '100')
    .replace(/\btwo\s+hundred\b/gi, '200')
    .replace(/\bthree\s+hundred\b/gi, '300')
    .replace(/\bfour\s+hundred\b/gi, '400')
    .replace(/\bfive\s+hundred\b/gi, '500')
    .replace(/\bsix\s+hundred\b/gi, '600')
    .replace(/\bseven\s+hundred\b/gi, '700')
    .replace(/\beight\s+hundred\b/gi, '800')
    .replace(/\bnine\s+hundred\b/gi, '900');

  return normalized;
}

/**
 * Extracts and converts all numerical amounts from text.
 * CRITICAL: Prioritizes complete multiplier expressions like "20 ஆயிரம்", "50 ஆயிரம்", "2 லட்சம்", "20k".
 * @param {string} text
 * @returns {number[]} Array of detected numbers sorted by appearance
 */
export function parseTamilAndEnglishNumbers(text = '') {
  if (!text || typeof text !== 'string') return [];

  const preNormalized = preNormalizeSpokenNumbers(text);
  const lowerText = preNormalized.toLowerCase().trim();
  const detected = [];

  // Unicode negative lookahead: ensures we don't stop mid-word without breaking non-ASCII Tamil characters
  const boundaryLookahead = '(?![a-zA-Z\\u0B80-\\u0BFF])';

  // 1. PRIORITY 1: Digit + Multiplier Patterns (e.g., "20 ஆயிரம்", "25 ஆயிரம்", "2 லட்சம்", "20 thousand", "20k")
  // Check Crores: "2 கோடி", "1 crore"
  const croreRegex = new RegExp(`(\\d[\\d,]*\\.?\\d*)\\s*(?:கோடி|crore|crores)${boundaryLookahead}`, 'gi');
  const croreMatches = lowerText.match(croreRegex);
  if (croreMatches) {
    croreMatches.forEach(m => {
      const cleanNum = parseFloat(m.replace(/[^\d.]/g, ''));
      if (!isNaN(cleanNum) && cleanNum > 0) {
        detected.push(cleanNum * 10000000);
      }
    });
  }

  // Check Lakhs: "2 லட்சம்", "5 லட்சம்", "10 லட்சம்", "2 lakh", "2.5 lakhs"
  const lakhRegex = new RegExp(`(\\d[\\d,]*\\.?\\d*)\\s*(?:லட்சம்|லக்ஷம்|லட்ச|lakh|lakhs|lac|lacs)${boundaryLookahead}`, 'gi');
  const lakhMatches = lowerText.match(lakhRegex);
  if (lakhMatches) {
    lakhMatches.forEach(m => {
      const cleanNum = parseFloat(m.replace(/[^\d.]/g, ''));
      if (!isNaN(cleanNum) && cleanNum > 0) {
        detected.push(cleanNum * 100000);
      }
    });
  }

  // Check Thousands: "20 ஆயிரம்", "5 ஆயிரம்", "50 ஆயிரம்", "20 thousand", "20k", "25k"
  const thousandRegex = new RegExp(`(\\d[\\d,]*\\.?\\d*)\\s*(?:ஆயிரம்|ஆயிர|thousand|thousands|k)${boundaryLookahead}`, 'gi');
  const thousandMatches = lowerText.match(thousandRegex);
  if (thousandMatches) {
    thousandMatches.forEach(m => {
      const cleanNum = parseFloat(m.replace(/[^\d.]/g, ''));
      if (!isNaN(cleanNum) && cleanNum > 0) {
        detected.push(cleanNum * 1000);
      }
    });
  }

  // Check Hundreds: "5 நூறு", "2 hundred"
  const hundredRegex = new RegExp(`(\\d[\\d,]*\\.?\\d*)\\s*(?:நூறு|நூறா|hundred|hundreds)${boundaryLookahead}`, 'gi');
  const hundredMatches = lowerText.match(hundredRegex);
  if (hundredMatches) {
    hundredMatches.forEach(m => {
      const cleanNum = parseFloat(m.replace(/[^\d.]/g, ''));
      if (!isNaN(cleanNum) && cleanNum > 0) {
        detected.push(cleanNum * 100);
      }
    });
  }

  if (detected.length > 0) {
    return detected;
  }

  // 2. PRIORITY 2: Standalone Numeric Digits (e.g., 20000, 20,000, ₹20000, 500, 20)
  // Only matched if no multipliers were attached!
  const digitMatches = lowerText.match(/(?:₹|rs|rs\.|rupees|ரூபாய்|ரூபா)?\s*(\d[\d,]*\.?\d*)/gi);
  if (digitMatches) {
    digitMatches.forEach(m => {
      const cleanStr = m.replace(/[^\d.]/g, '');
      const num = parseFloat(cleanStr);
      if (!isNaN(num) && num > 0) {
        detected.push(num);
      }
    });
  }

  if (detected.length > 0) {
    return detected;
  }

  // 3. PRIORITY 3: Spoken Tamil Compound Words (e.g. "இருபதாயிரம்", "ஐம்பதாயிரம்", "இரண்டு லட்சம்", "ஐந்நூறு")
  let currentTotal = 0;
  let remainingText = lowerText;

  for (const [word, val] of ALL_TAMIL_NUMBERS_SORTED) {
    if (remainingText.includes(word)) {
      currentTotal += val;
      remainingText = remainingText.replace(word, ' ').trim();
    }
  }

  if (currentTotal > 0) {
    detected.push(currentTotal);
    return detected;
  }

  // 4. PRIORITY 4: Spoken English Number Words (e.g. "twenty thousand", "five hundred")
  let engTotal = 0;
  const words = lowerText.split(/\s+/);
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (ENGLISH_NUMBER_WORDS_MAP[w] !== undefined) {
      const val = ENGLISH_NUMBER_WORDS_MAP[w];
      if (val === 100 || val === 1000 || val === 100000 || val === 10000000) {
        if (engTotal === 0) engTotal = 1;
        engTotal *= val;
      } else {
        engTotal += val;
      }
    }
  }

  if (engTotal > 0) {
    detected.push(engTotal);
  }

  return detected;
}

/**
 * All Tamil number words list for token cleaning
 */
export const ALL_NUMBER_WORDS_LIST = [
  ...ALL_TAMIL_NUMBERS_SORTED.map(([word]) => word),
  'ஆயிரம்', 'ஆயிர', 'லட்சம்', 'லக்ஷம்', 'கோடி', 'நூறு',
  ...Object.keys(ENGLISH_NUMBER_WORDS_MAP)
];
