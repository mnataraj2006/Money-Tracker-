/**
 * Tamil and English Spoken Number Parser
 * Converts spoken Tamil number words, compound Tamil numbers, spoken English numbers,
 * and numeric digits into clean numeric values.
 */

// Basic Tamil Number Units (0 - 9)
const TAMIL_UNITS = {
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

// Basic Tamil Tens (10 - 90)
const TAMIL_TENS = {
  'பத்து': 10, 'பத்தா': 10,
  'இருபது': 20, 'இருபதா': 20,
  'முப்பது': 30, 'முப்பதா': 30,
  'நாற்பது': 40, 'நாற்பதா': 40,
  'ஐம்பது': 50, 'ஐம்பதா': 50,
  'அறுபது': 60, 'அறுபதா': 60,
  'எழுபது': 70, 'எழுபதா': 70,
  'எண்பது': 80, 'எண்பதா': 80,
  'தொண்ணூறு': 90, 'தொண்ணூறா': 90
};

// Tamil Tens Prefixes for Compound Tens (e.g., இருபத்து ஐந்து = 25)
const TAMIL_TENS_PREFIX = {
  'பதின்': 10, 'பதினோ': 11, 'பனிரெண்டு': 12, 'பதின்மூன்று': 13, 'பதினான்கு': 14, 'பதினைந்து': 15, 'பதினாறு': 16, 'பதினேழு': 17, 'பதினெட்டு': 18, 'பத்தொன்பது': 19,
  'இருபத்து': 20,
  'முப்பத்து': 30,
  'நாற்பத்து': 40,
  'ஐம்பத்து': 50,
  'அறுபத்து': 60,
  'எழுபத்து': 70,
  'எண்பத்து': 80,
  'தொண்ணூற்று': 90
};

// Basic Tamil Hundreds (100 - 900)
const TAMIL_HUNDREDS = {
  'நூறு': 100, 'நூறா': 100,
  'இருநூறு': 200,
  'முந்நூறு': 300,
  'நானூறு': 400,
  'ஐந்நூறு': 500, 'ஐநூறு': 500,
  'அறுநூறு': 600,
  'எழுநூறு': 700,
  'எண்ணூறு': 800,
  'தொள்ளாயிரம்': 900
};

// Tamil Hundreds Prefixes for Compound Hundreds (e.g., இருநூற்று ஐம்பது = 250)
const TAMIL_HUNDREDS_PREFIX = {
  'நூற்றி': 100,
  'இருநூற்று': 200,
  'முந்நூற்று': 300,
  'நானூற்று': 400,
  'ஐந்நூற்று': 500, 'ஐநூற்று': 500,
  'அறுநூற்று': 600,
  'எழுநூற்று': 700,
  'எண்ணூற்று': 800,
  'தொள்ளாயிரத்து': 900
};

// Basic Tamil Thousands (1000 - 90000)
const TAMIL_THOUSANDS = {
  'ஆயிரம்': 1000,
  'இரண்டாயிரம்': 2000, 'ரெண்டாயிரம்': 2000,
  'மூன்றாயிரம்': 3000,
  'நான்காயிரம்': 4000,
  'ஐந்தாயிரம்': 5000, 'ஐயாயிரம்': 5000,
  'ஆறாயிரம்': 6000,
  'ஏழாயிரம்': 7000,
  'எட்டாயிரம்': 8000,
  'ஒன்பதாயிரம்': 9000,
  'பத்தாயிரம்': 10000,
  'பதினைந்தாயிரம்': 15000,
  'இருபதாயிரம்': 20000,
  'ஐம்பதாயிரம்': 50000,
  'லட்சம்': 100000, 'லக்ஷம்': 100000, 'ஒரு லட்சம்': 100000
};

// Tamil Thousands Prefixes (e.g., ஆயிரத்து ஐநூறு = 1500)
const TAMIL_THOUSANDS_PREFIX = {
  'ஆயிரத்து': 1000,
  'இரண்டாயிரத்து': 2000, 'ரெண்டாயிரத்து': 2000,
  'மூன்றாயிரத்து': 3000,
  'நான்காயிரத்து': 4000,
  'ஐந்தாயிரத்து': 5000, 'ஐயாயிரத்து': 5000,
  'பத்தாயிரத்து': 10000
};

// Spoken English Number Words
const ENGLISH_NUMBER_WORDS = {
  'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
  'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
  'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15,
  'sixteen': 16, 'seventeen': 17, 'eighteen': 18, 'nineteen': 19,
  'twenty': 20, 'thirty': 30, 'forty': 40, 'fifty': 50,
  'sixty': 60, 'seventy': 70, 'eighty': 80, 'ninety': 90,
  'hundred': 100, 'thousand': 1000, 'lakh': 100000
};

/**
 * Extracts and converts all numerical amounts from text (digits & Tamil/English words)
 * @param {string} text
 * @returns {number[]} Array of detected numbers sorted by appearance
 */
export function parseTamilAndEnglishNumbers(text = '') {
  if (!text || typeof text !== 'string') return [];

  const lowerText = text.toLowerCase().trim();
  const detected = [];

  // 1. Direct Digit Patterns (e.g., 250, 5000, 2,500, ₹250, 250rs, 250ரூபாய்)
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

  // If numeric digits were found, return them
  if (detected.length > 0) {
    return detected;
  }

  // 2. Tamil Thousands + Hundreds Compound Parsing (e.g., "ஆயிரத்து ஐநூறு", "இருநூற்று ஐம்பது")
  let currentTotal = 0;
  let remainingText = lowerText;

  // Check Thousands Prefix (e.g. ஆயிரத்து ஐநூறு)
  for (const [prefix, val] of Object.entries(TAMIL_THOUSANDS_PREFIX)) {
    if (remainingText.includes(prefix)) {
      currentTotal += val;
      remainingText = remainingText.replace(prefix, '').trim();
      break;
    }
  }

  // Check Standalone Thousands (e.g. ஐந்தாயிரம்)
  if (currentTotal === 0) {
    for (const [word, val] of Object.entries(TAMIL_THOUSANDS)) {
      if (remainingText.includes(word)) {
        currentTotal += val;
        remainingText = remainingText.replace(word, '').trim();
        break;
      }
    }
  }

  // Check Hundreds Prefix (e.g. இருநூற்று ஐம்பது)
  for (const [prefix, val] of Object.entries(TAMIL_HUNDREDS_PREFIX)) {
    if (remainingText.includes(prefix)) {
      currentTotal += val;
      remainingText = remainingText.replace(prefix, '').trim();
      break;
    }
  }

  // Check Standalone Hundreds (e.g. ஐந்நூறு)
  for (const [word, val] of Object.entries(TAMIL_HUNDREDS)) {
    if (remainingText.includes(word)) {
      currentTotal += val;
      remainingText = remainingText.replace(word, '').trim();
      break;
    }
  }

  // Check Tens Prefix (e.g. இருபத்து ஐந்து)
  for (const [prefix, val] of Object.entries(TAMIL_TENS_PREFIX)) {
    if (remainingText.includes(prefix)) {
      currentTotal += val;
      remainingText = remainingText.replace(prefix, '').trim();
      break;
    }
  }

  // Check Standalone Tens (e.g. ஐம்பது)
  for (const [word, val] of Object.entries(TAMIL_TENS)) {
    if (remainingText.includes(word)) {
      currentTotal += val;
      remainingText = remainingText.replace(word, '').trim();
      break;
    }
  }

  // Check Standalone Units (e.g. ஐந்து)
  for (const [word, val] of Object.entries(TAMIL_UNITS)) {
    if (remainingText.includes(word)) {
      currentTotal += val;
      remainingText = remainingText.replace(word, '').trim();
      break;
    }
  }

  if (currentTotal > 0) {
    detected.push(currentTotal);
    return detected;
  }

  // 3. Spoken English Number Words Parsing (e.g. "two hundred fifty", "one thousand")
  let engTotal = 0;
  const words = lowerText.split(/\s+/);
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (ENGLISH_NUMBER_WORDS[w] !== undefined) {
      const val = ENGLISH_NUMBER_WORDS[w];
      if (val === 100 || val === 1000 || val === 100000) {
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
