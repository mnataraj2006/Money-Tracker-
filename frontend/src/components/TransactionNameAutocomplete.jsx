import React, { useState, useEffect, useRef, useMemo } from 'react';
import { transactionsAPI } from '../services/api';
import { useDataCache } from '../context/DataContext';

// Baseline common suggestions for immediate helpfulness (Tamil & English)
const DEFAULT_SUGGESTIONS = [
  'மளிகை',
  'மருந்து',
  'பால்',
  'காய்கறி',
  'பெட்ரோல்',
  'சம்பளம்',
  'வாடகை',
  'டிபன்',
  'டீ / காபி',
  'பழங்கள்',
  'கரண்ட் பில்',
  'ரீசார்ஜ்',
  'பஸ் / ஆட்டோ',
  'மருத்துவமனை',
  'Salary',
  'Groceries',
  'Petrol',
  'Medicine',
  'Rent',
  'Milk',
  'Vegetables',
  'Electricity Bill',
  'Mobile Recharge',
  'Tea & Coffee',
  'Snacks',
  'Dinner',
  'Lunch'
];

export default function TransactionNameAutocomplete({
  value = '',
  onChange,
  placeholder = 'e.g. Milk, Petrol, காய்கறி',
  className = 'input-control',
  style = {},
  inputStyle = {},
  required = false,
  autoFocus = false,
  id
}) {
  const { cache } = useDataCache();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [historyItems, setHistoryItems] = useState([]);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Load transaction history once on mount to build frequency/recency model
  useEffect(() => {
    let isMounted = true;

    const loadHistory = async () => {
      try {
        let txs = cache.transactions || cache.dashboard?.recentTransactions || [];
        if (!txs || txs.length === 0) {
          const res = await transactionsAPI.getAll({ limit: 100 });
          txs = res.transactions || [];
        }

        if (!isMounted) return;

        // Process transaction history: count frequency and preserve recency order
        const recencyList = [];
        const freqMap = {};

        txs.forEach((t) => {
          const rawName = (t.transactionName || t.name || '').trim();
          if (rawName && rawName.toLowerCase() !== 'unnamed transaction' && rawName !== '—') {
            recencyList.push(rawName);
            const lower = rawName.toLowerCase();
            freqMap[lower] = (freqMap[lower] || 0) + 1;
          }
        });

        // Combine unique user history with defaults
        const seen = new Set();
        const combined = [];

        recencyList.forEach((name) => {
          const lower = name.toLowerCase();
          if (!seen.has(lower)) {
            seen.add(lower);
            combined.push({
              name,
              lower,
              frequency: freqMap[lower] || 1,
              isUserHistory: true
            });
          }
        });

        DEFAULT_SUGGESTIONS.forEach((name) => {
          const lower = name.toLowerCase();
          if (!seen.has(lower)) {
            seen.add(lower);
            combined.push({
              name,
              lower,
              frequency: 0,
              isUserHistory: false
            });
          }
        });

        setHistoryItems(combined);
      } catch (err) {
        // Fallback to default suggestions on network error
        if (isMounted) {
          setHistoryItems(
            DEFAULT_SUGGESTIONS.map((name) => ({
              name,
              lower: name.toLowerCase(),
              frequency: 0,
              isUserHistory: false
            }))
          );
        }
      }
    };

    loadHistory();

    return () => {
      isMounted = false;
    };
  }, [cache.transactions, cache.dashboard]);

  // Click outside to dismiss dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  // Compute smart ranked suggestions based on input
  const suggestions = useMemo(() => {
    const query = (value || '').trim().toLowerCase().normalize('NFC');

    // If query is empty, return up to 3 recent user entries
    if (!query) {
      return historyItems
        .filter((item) => item.isUserHistory)
        .slice(0, 3)
        .map((item) => item.name);
    }

    const scored = [];

    historyItems.forEach((item, index) => {
      const target = item.lower.normalize('NFC');
      let score = 0;

      if (target === query) {
        // Exact match
        score = 1000;
      } else if (target.startsWith(query)) {
        // Starts-with / Prefix match (Highest priority)
        score = 500 + Math.max(0, 50 - (target.length - query.length));
      } else if (target.includes(query)) {
        // Contains match (Secondary priority)
        score = 200 + Math.max(0, 30 - target.indexOf(query));
      } else {
        return; // No match
      }

      // Bonus for frequency (how many times user used it)
      score += Math.min(item.frequency * 15, 150);

      // Bonus for user-history over defaults
      if (item.isUserHistory) score += 50;

      // Bonus for recency in list
      score += Math.max(0, 30 - index);

      scored.push({ name: item.name, score });
    });

    // Sort by score descending and limit to top 5
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 5).map((s) => s.name);
  }, [value, historyItems]);

  const handleInputChange = (e) => {
    const newVal = e.target.value;
    onChange(newVal);
    setIsOpen(true);
    setSelectedIndex(-1);
  };

  const handleFocus = () => {
    if (suggestions.length > 0) {
      setIsOpen(true);
    }
  };

  const handleSelectSuggestion = (suggestion) => {
    onChange(suggestion);
    setIsOpen(false);
    setSelectedIndex(-1);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === 'ArrowDown') {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
        e.preventDefault();
        handleSelectSuggestion(suggestions[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setSelectedIndex(-1);
    }
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        ...style
      }}
    >
      <input
        ref={inputRef}
        id={id}
        type="text"
        className={className}
        placeholder={placeholder}
        value={value}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        required={required}
        autoFocus={autoFocus}
        autoComplete="off"
        autoCorrect="off"
        spellCheck="false"
        style={{
          width: '100%',
          boxSizing: 'border-box',
          ...inputStyle
        }}
      />

      {/* Suggestion Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1.5px solid #CBD5E1',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
            zIndex: 99999,
            overflow: 'hidden',
            maxHeight: '260px',
            overflowY: 'auto'
          }}
        >
          {suggestions.map((suggestion, index) => {
            const isSelected = index === selectedIndex;
            return (
              <div
                key={suggestion}
                onClick={() => handleSelectSuggestion(suggestion)}
                onMouseEnter={() => setSelectedIndex(index)}
                style={{
                  minHeight: '44px',
                  padding: '10px 16px',
                  fontSize: '15px',
                  fontWeight: '600',
                  color: isSelected ? '#16247B' : '#1E293B',
                  backgroundColor: isSelected ? '#EEF2FF' : '#FFFFFF',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  borderBottom: index < suggestions.length - 1 ? '1px solid #F1F5F9' : 'none',
                  transition: 'background-color 0.15s ease',
                  userSelect: 'none',
                  WebkitTapHighlightColor: 'transparent'
                }}
              >
                <span>{suggestion}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
