/**
 * Transcript Normalizer & Vocabulary Vocabulary Dictionary
 * Conservative spacing normalization, category aliases, and payment method mapping.
 */

export const CATEGORY_ALIASES = [
  {
    category: 'Vegetables',
    aliases: [
      'காய்கறி', 'காய்கறிக்கு', 'காய்கறிகள்', 'காய்கறிகளுக்கு', 'காய்கறிக்கு செலவு',
      'vegetable', 'vegetables', 'veggies', 'veg'
    ]
  },
  {
    category: 'Groceries',
    aliases: [
      'மளிகை', 'மளிகைக்கு', 'மளிகை சாமான்', 'மளிகை பொருட்கள்', 'மளிகை பொருட்கள் வாங்கினேன்', 'மளிகைப் பொருள்',
      'groceries', 'grocery', 'supermarket', 'provisions'
    ]
  },
  {
    category: 'Petrol',
    aliases: [
      'பெட்ரோல்', 'பெட்ரோலுக்கு', 'டீசல்', 'எரிபொருள்', 'வண்டி பெட்ரோல்',
      'petrol', 'diesel', 'fuel', 'gas'
    ]
  },
  {
    category: 'Rent',
    aliases: [
      'வாடகை', 'வீட்டு வாடகை', 'வாடகைக்கு', 'வீட்டுவாடகை',
      'rent', 'house rent', 'room rent'
    ]
  },
  {
    category: 'Peanut Candy',
    aliases: [
      'கடலை மிட்டாய்', 'கடலைமிட்டாய்', 'கடலை மிட்டாய்க்கு', 'மிட்டாய்',
      'peanut candy', 'chikki', 'peanut'
    ]
  },
  {
    category: 'Food',
    aliases: [
      'சாப்பாடு', 'சாப்பாட்டுக்கு', 'ஹோட்டல்', 'உணவு', 'டிபன்', 'தேநீர்', 'காபி', 'பிரியாணி',
      'food', 'hotel', 'restaurant', 'dinner', 'lunch', 'breakfast', 'swiggy', 'zomato'
    ]
  },
  {
    category: 'Bills',
    aliases: [
      'கட்டணம்', 'ஈபி கட்டணம்', 'மின்சாரம்', 'ரீசார்ஜ்', 'போன் ரீசார்ஜ்', 'கரண்ட் பில்',
      'bill', 'bills', 'electricity', 'eb', 'current bill', 'recharge', 'mobile recharge', 'wifi'
    ]
  },
  {
    category: 'Salary',
    aliases: [
      'சம்பளம்', 'சம்பளமாக', 'சம்பளத்துக்கு', 'கூலி', 'ஊதியம்', 'வருமானம்',
      'salary', 'wages', 'stipend', 'bonus', 'paycheck'
    ]
  },
  {
    category: 'Medical',
    aliases: [
      'மருந்து', 'மருந்துக்கு', 'மருத்துவம்', 'டாக்டர்', 'ஆஸ்பத்திரி', 'மாத்திரை',
      'medical', 'medicine', 'medicines', 'doctor', 'hospital', 'pharmacy', 'clinic'
    ]
  },
  {
    category: 'Transport',
    aliases: [
      'பஸ்', 'ஆட்டோ', 'டிக்கெட்', 'பயணம்', 'டாக்ஸி', 'ரயில்',
      'transport', 'bus', 'auto', 'cab', 'taxi', 'train', 'ticket', 'fare'
    ]
  }
];

export const PAYMENT_METHOD_MAP = {
  CASH: [
    'cash', 'கேஷ்', 'காசு', 'ரொக்கம்', 'cashல', 'cash-ல', 'பணம்', 'பணமாய்', 'கையில்', 'ரொக்கமாக'
  ],
  UPI: [
    'upi', 'யுபிஐ', 'upiல', 'upi-ல', 'gpay', 'google pay', 'phonepe', 'paytm', 'qr', 'gpayல', 'phonepeல'
  ],
  BANK: [
    'bank', 'வங்கியில்', 'வங்கி', 'netbanking', 'bankல', 'transfer', 'neft', 'imps', 'account'
  ],
  CARD: [
    'card', 'கார்டு', 'cardல', 'card-ல', 'credit card', 'debit card'
  ]
};

export const EXPENSE_KEYWORDS = [
  'செலவு', 'செலவானது', 'செலவு செய்தேன்', 'செலவு பண்ணினேன்', 'வாங்கினேன்', 'வாங்குனேன்',
  'கொடுத்தேன்', 'கொடுத்து', 'வாங்கி', 'பணம் செலவானது', 'selavu', 'spent', 'paid', 'bought', 'expense', 'purchase'
];

export const INCOME_KEYWORDS = [
  'வரவு', 'வருமானம்', 'வந்தது', 'வந்துச்சு', 'கிடைத்தது', 'கிடைச்சது', 'பெற்றேன்', 'சம்பளம்',
  'சம்பளமாக வந்தது', 'received', 'got', 'earned', 'salary', 'income', 'credited', 'deposit'
];

/**
 * Normalizes speech text spacing and common Tamil-English suffixes
 * @param {string} text
 * @returns {string} Normalized string
 */
export function normalizeTranscript(text = '') {
  if (!text || typeof text !== 'string') return '';

  return text
    .trim()
    // Spacing fixes for common Tamil suffixes
    .replace(/\s+க்கு\b/g, 'க்கு')
    .replace(/\s+ல\b/g, 'ல')
    .replace(/\s+இல்\b/g, 'இல்')
    .replace(/\s+ஆக\b/g, 'ஆக')
    .replace(/cash\s+ல/gi, 'cashல')
    .replace(/upi\s+ல/gi, 'upiல')
    .replace(/bank\s+ல/gi, 'bankல')
    .replace(/card\s+ல/gi, 'cardல')
    .replace(/gpay\s+ல/gi, 'gpayல');
}
