/**
 * Comprehensive NLP Transaction Parser for Cashly
 * Integrates transcriptNormalizer and tamilNumberParser for high-accuracy extraction.
 */

import { parseTamilAndEnglishNumbers } from './tamilNumberParser';
import {
  normalizeTranscript,
  CATEGORY_ALIASES,
  PAYMENT_METHOD_MAP,
  EXPENSE_KEYWORDS,
  INCOME_KEYWORDS
} from './transcriptNormalizer';

export function parseTransactionFromSpeech(rawTranscript = '') {
  if (!rawTranscript || typeof rawTranscript !== 'string') {
    return createEmptyParsedResult();
  }

  const cleanRaw = rawTranscript.trim();
  const normalizedText = normalizeTranscript(cleanRaw);
  const lowerText = normalizedText.toLowerCase();

  // 1. Determine Transaction Type (INCOME vs EXPENSE)
  let type = null;
  const hasIncomeKw = INCOME_KEYWORDS.some(kw => lowerText.includes(kw.toLowerCase()));
  const hasExpenseKw = EXPENSE_KEYWORDS.some(kw => lowerText.includes(kw.toLowerCase()));

  if (hasIncomeKw && !hasExpenseKw) {
    type = 'INCOME';
  } else if (hasExpenseKw && !hasIncomeKw) {
    type = 'EXPENSE';
  } else if (hasExpenseKw && hasIncomeKw) {
    if (lowerText.includes('வந்தது') || lowerText.includes('received') || lowerText.includes('சம்பளமாக')) {
      type = 'INCOME';
    } else {
      type = 'EXPENSE';
    }
  } else {
    // Default to EXPENSE if ambiguous, but mark for user review
    type = 'EXPENSE';
  }

  // 2. Extract Amount (Tamil & English Spoken Numbers + Digits)
  const detectedAmounts = parseTamilAndEnglishNumbers(normalizedText);
  let amount = detectedAmounts.length > 0 ? detectedAmounts[0] : null;

  // 3. Extract Payment Method (CASH, UPI, BANK, CARD)
  let paymentMethod = null;
  for (const [pm, aliases] of Object.entries(PAYMENT_METHOD_MAP)) {
    if (aliases.some(alias => lowerText.includes(alias.toLowerCase()))) {
      paymentMethod = pm;
      break;
    }
  }

  // 4. Extract Category using Aliases
  let category = type === 'INCOME' ? 'Salary' : 'Groceries';
  let matchedCategoryFound = false;

  for (const item of CATEGORY_ALIASES) {
    if (item.aliases.some(alias => lowerText.includes(alias.toLowerCase()))) {
      category = item.category;
      matchedCategoryFound = true;
      break;
    }
  }

  // 5. Date (Default Today, support Yesterday / நேற்று)
  let date = new Date().toISOString().split('T')[0];
  const yesterdayKw = ['yesterday', 'நேற்று', 'nethu', 'naetru'];
  if (yesterdayKw.some(kw => lowerText.includes(kw))) {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    date = d.toISOString().split('T')[0];
  }

  // 6. Generate Clean Description
  let description = cleanRaw;
  const cleanDesc = cleanRaw
    .replace(/(?:₹|rs|rs\.|rupees|rupee|ரூபாய்|ரூபா|\d+)/gi, '')
    .replace(/(?:spent|paid|bought|expense|received|got|earned|cash|upi|bank|card|today|yesterday|நேற்று|இன்று|செலவு|வந்தது|கேஷில்|cashல|upiல|gpay|pay|பண்ணினேன்|கொடுத்தேன்|வாங்குனேன்)/gi, '')
    .trim();

  if (cleanDesc.length > 2) {
    description = cleanDesc.charAt(0).toUpperCase() + cleanDesc.slice(1);
  } else {
    description = '';
  }

  return {
    rawTranscript: cleanRaw,
    normalizedTranscript: normalizedText,
    type,
    amount,
    detectedAmounts,
    category,
    matchedCategoryFound,
    paymentMethod,
    date,
    description
  };
}

function createEmptyParsedResult() {
  return {
    rawTranscript: '',
    normalizedTranscript: '',
    type: 'EXPENSE',
    amount: null,
    detectedAmounts: [],
    category: 'Groceries',
    matchedCategoryFound: false,
    paymentMethod: null,
    date: new Date().toISOString().split('T')[0],
    description: ''
  };
}
