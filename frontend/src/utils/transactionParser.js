/**
 * Comprehensive NLP Transaction Parser for Cashly
 * Extracts Transaction Type, Amount, Transaction Name, Description, Payment Method, and Date.
 * NOTE: Category is NOT extracted and NOT assigned.
 */

import {
  parseTamilAndEnglishNumbers,
  preNormalizeSpokenNumbers,
  normalizeBoundaryWhitespace,
  ALL_NUMBER_WORDS_LIST
} from './tamilNumberParser.js';
import {
  normalizeTranscript,
  PAYMENT_METHOD_MAP,
  EXPENSE_KEYWORDS,
  INCOME_KEYWORDS
} from './transcriptNormalizer.js';

// Set of words to strip when extracting transaction name
const STRIP_WORDS_SET = new Set([
  // Currency
  '₹', 'rs', 'rs.', 'rupees', 'rupee', 'ரூபாய்', 'ரூபா', 'ரூபாய்க்கு', 'ரூ', 'inr',
  // Digits and numbers
  ...ALL_NUMBER_WORDS_LIST.map(w => w.toLowerCase()),
  'ஆயிரம்', 'ஆயிர', 'லட்சம்', 'லக்ஷம்', 'கோடி', 'நூறு', 'k', 'thousand', 'thousands', 'lakh', 'lakhs',
  // Expense / Income keywords
  ...EXPENSE_KEYWORDS.map(w => w.toLowerCase()),
  ...INCOME_KEYWORDS.map(w => w.toLowerCase()),
  // Payment keywords
  'cash', 'upi', 'bank', 'card', 'gpay', 'phonepe', 'paytm', 'qr',
  'கேஷ்', 'காசு', 'ரொக்கம்', 'cashல', 'cash-ல', 'பணம்', 'பணமாய்', 'கையில்', 'ரொக்கமாக',
  'யுபிஐ', 'upiல', 'upi-ல', 'gpayல', 'phonepeல', 'கார்டு', 'வங்கி',
  // Date keywords
  'today', 'yesterday', 'நேற்று', 'இன்று', 'nethu', 'naetru'
]);

export function parseTransactionFromSpeech(rawTranscript = '') {
  if (!rawTranscript || typeof rawTranscript !== 'string') {
    return createEmptyParsedResult();
  }

  const cleanRaw = rawTranscript.trim();
  const boundaryFixed = normalizeBoundaryWhitespace(cleanRaw);
  const preNormalized = preNormalizeSpokenNumbers(boundaryFixed);
  const normalizedText = normalizeTranscript(preNormalized);
  const lowerText = normalizedText.toLowerCase();

  // 1. Determine Transaction Type (INCOME vs EXPENSE)
  let type = 'EXPENSE';
  const hasIncomeKw = INCOME_KEYWORDS.some(kw => lowerText.includes(kw.toLowerCase()));
  const hasExpenseKw = EXPENSE_KEYWORDS.some(kw => lowerText.includes(kw.toLowerCase()));

  if (hasIncomeKw && !hasExpenseKw) {
    type = 'INCOME';
  } else if (hasExpenseKw && !hasIncomeKw) {
    type = 'EXPENSE';
  } else if (hasExpenseKw && hasIncomeKw) {
    if (lowerText.includes('வந்தது') || lowerText.includes('received') || lowerText.includes('சம்பளமாக') || lowerText.includes('credited')) {
      type = 'INCOME';
    } else {
      type = 'EXPENSE';
    }
  }

  // 2. Extract Amount (with explicit Multipliers prioritized)
  const detectedAmounts = parseTamilAndEnglishNumbers(boundaryFixed);
  let amount = detectedAmounts.length > 0 ? detectedAmounts[0] : null;

  // 3. Extract Payment Method (CASH or UPI only)
  let paymentMethod = 'CASH'; // Default to Cash
  if (PAYMENT_METHOD_MAP.UPI && PAYMENT_METHOD_MAP.UPI.some(alias => lowerText.includes(alias.toLowerCase()))) {
    paymentMethod = 'UPI';
  } else if (PAYMENT_METHOD_MAP.CASH && PAYMENT_METHOD_MAP.CASH.some(alias => lowerText.includes(alias.toLowerCase()))) {
    paymentMethod = 'CASH';
  }

  // 4. Date (Default Today, support Yesterday / நேற்று)
  let date = new Date().toISOString().split('T')[0];
  const yesterdayKw = ['yesterday', 'நேற்று', 'nethu', 'naetru'];
  if (yesterdayKw.some(kw => lowerText.includes(kw))) {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    date = d.toISOString().split('T')[0];
  }

  // 5. Extract Transaction Name and Description
  // Tokenize boundaryFixed string and strip all numbers, multipliers, currency terms, type keywords, and payment methods
  const rawTokens = boundaryFixed.split(/\s+/).filter(Boolean);
  const meaningfulTokens = [];

  for (const token of rawTokens) {
    const cleanToken = token.toLowerCase().replace(/^[^\w\u0B80-\u0BFF]+|[^\w\u0B80-\u0BFF]+$/g, '');
    if (!cleanToken) continue;

    // Check if token is a number, digit (with or without comma/period), or money word
    const digitOnly = cleanToken.replace(/[,.]/g, '');
    if (/^\d+$/.test(digitOnly)) continue;
    if (STRIP_WORDS_SET.has(cleanToken) || STRIP_WORDS_SET.has(digitOnly)) continue;

    // Check if token starts with currency symbol
    if (cleanToken.startsWith('₹') || cleanToken.startsWith('rs') || cleanToken.startsWith('inr')) continue;

    meaningfulTokens.push(token);
  }

  let transactionName = '';
  let description = '';

  if (meaningfulTokens.length === 1) {
    transactionName = meaningfulTokens[0];
    description = '';
  } else if (meaningfulTokens.length === 2) {
    const second = meaningfulTokens[1];
    if (second.endsWith('க்கு') || second.endsWith('க்காக') || second.startsWith('for') || second.toLowerCase() === 'fuel') {
      transactionName = meaningfulTokens[0];
      description = meaningfulTokens[1];
    } else {
      transactionName = meaningfulTokens.join(' ');
      description = '';
    }
  } else if (meaningfulTokens.length > 2) {
    const purposeKeywords = ['for', 'பைக்குக்கு', 'வீட்டுக்கு', 'கடைக்கு'];
    let splitIdx = -1;
    for (let i = 1; i < meaningfulTokens.length; i++) {
      if (purposeKeywords.includes(meaningfulTokens[i].toLowerCase()) || meaningfulTokens[i].endsWith('க்கு')) {
        splitIdx = i;
        break;
      }
    }

    if (splitIdx > 0) {
      transactionName = meaningfulTokens.slice(0, splitIdx).join(' ');
      description = meaningfulTokens.slice(splitIdx).join(' ');
    } else {
      transactionName = meaningfulTokens.join(' ');
      description = '';
    }
  }

  // Capitalize first letter if Latin
  if (transactionName.length > 0 && /^[a-zA-Z]/.test(transactionName)) {
    transactionName = transactionName.charAt(0).toUpperCase() + transactionName.slice(1);
  }
  if (description.length > 0 && /^[a-zA-Z]/.test(description)) {
    description = description.charAt(0).toUpperCase() + description.slice(1);
  }

  if (typeof window !== 'undefined' && (import.meta.env?.DEV || localStorage.getItem('cashly_voice_debug') === 'true')) {
    console.log('[VOICE PARSER DEBUG]:', {
      raw: cleanRaw,
      normalized: normalizedText,
      detectedAmount: amount,
      parsedName: transactionName,
      type,
      paymentMethod
    });
  }

  return {
    rawTranscript: cleanRaw,
    normalizedTranscript: normalizedText,
    type,
    amount,
    detectedAmounts,
    transactionName,
    name: transactionName,
    description,
    paymentMethod,
    date
  };
}

function createEmptyParsedResult() {
  return {
    rawTranscript: '',
    normalizedTranscript: '',
    type: 'EXPENSE',
    amount: null,
    detectedAmounts: [],
    transactionName: '',
    name: '',
    description: '',
    paymentMethod: 'CASH',
    date: new Date().toISOString().split('T')[0]
  };
}
