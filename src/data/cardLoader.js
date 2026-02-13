/**
 * Card loader: local cards.json + optional AwardWallet API.
 * Each card shape: { name, issuer, annualFee, pointValue, multipliers: { dining, grocery, travel, rent, other } }
 */

import localCards from './cards.json';

const CATEGORY_MAP = {
  dining: ['dining', 'restaurants', 'food'],
  grocery: ['grocery', 'groceries', 'supermarkets', 'supermarket'],
  travel: ['travel', 'airlines', 'hotels', 'hotel', 'transit', 'gas', 'chase travel', 'travel portal'],
  rent: ['rent', 'rent payments', 'housing'],
  other: ['all purchases', 'other', 'drugstores', 'pharmacies', 'streaming', 'entertainment', 'shopping', 'department', 'home improvement', 'fitness', 'streaming services'],
};

function normalizeCategory(apiCategoryName) {
  if (!apiCategoryName || typeof apiCategoryName !== 'string') return 'other';
  const lower = apiCategoryName.toLowerCase();
  for (const [ourKey, keywords] of Object.entries(CATEGORY_MAP)) {
    if (keywords.some((k) => lower.includes(k))) return ourKey;
  }
  return 'other';
}

function normalizeAwardWalletCard(card) {
  const multipliers = { dining: 1, grocery: 1, travel: 1, rent: 1, other: 1 };
  const categories = card.earningCategories || [];
  for (const cat of categories) {
    const name = cat.categoryName;
    const mult = Number(cat.multiplier);
    if (!Number.isFinite(mult) || mult <= 0) continue;
    const key = normalizeCategory(name);
    if (mult > (multipliers[key] ?? 1)) multipliers[key] = mult;
  }
  const pointValue = Number(card.awardWalletPointValue);
  const name = card.cardName?.replace(/\\u00ae/g, '®').trim() || 'Unknown';
  const issuer = card.issuingBank || 'Unknown';
  return {
    name,
    issuer,
    annualFee: 0,
    pointValue: Number.isFinite(pointValue) && pointValue > 0 ? pointValue / 100 : 0.01,
    multipliers,
  };
}

async function fetchAwardWalletCards() {
  const auth = import.meta.env.VITE_AWARDWALLET_AUTH;
  if (!auth || typeof auth !== 'string') return [];

  const res = await fetch('https://us-cc-api.awardwallet.com/v1/cards', {
    headers: { 'X-Authentication': auth },
  });
  if (!res.ok) throw new Error(`AwardWallet API ${res.status}`);
  const data = await res.json();
  const cards = data?.cards ?? [];
  return cards.filter((c) => !c.isDiscontinued).map(normalizeAwardWalletCard);
}

function mergeCards(apiCards) {
  const seen = new Set(localCards.map((c) => c.name.toLowerCase().trim()));
  const merged = [...localCards];
  for (const card of apiCards) {
    const key = card.name.toLowerCase().trim();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(card);
  }
  return merged;
}

/**
 * Returns all cards (local + optional API). Use in App for comparison.
 * Set VITE_AWARDWALLET_AUTH to "username:password" to merge in AwardWallet cards.
 * @returns {Promise<Array<{ name, issuer, annualFee, pointValue, multipliers }>>}
 */
export async function getCards() {
  try {
    const apiCards = await fetchAwardWalletCards();
    return mergeCards(apiCards);
  } catch {
    return [...localCards];
  }
}

export { localCards };
