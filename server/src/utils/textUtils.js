/**
 * Text normalization and deduplication utilities for IntellMeet Action Items
 */

/**
 * Removes immediately repeated consecutive phrase sequences (1 to 8 words).
 * E.g.:
 *  "Rahul will complete the Rahul will complete the assessment by 28 October"
 *  -> "Rahul will complete the assessment by 28 October"
 *  "Review the PR Review the PR tomorrow"
 *  -> "Review the PR tomorrow"
 *
 * @param {string} str - Input text
 * @returns {string} Deduplicated text
 */
const removeConsecutiveDuplicatePhrases = (str) => {
  if (!str || typeof str !== 'string') return '';
  let text = str.trim().replace(/\s+/g, ' ');

  let changed = true;
  let iterations = 0;

  while (changed && iterations < 5) {
    changed = false;
    iterations++;

    const words = text.split(' ');
    const n = words.length;

    // Search for repeated chunks from length n/2 down to 1
    for (let len = Math.floor(n / 2); len >= 1; len--) {
      for (let i = 0; i <= n - 2 * len; i++) {
        const phrase1 = words.slice(i, i + len).join(' ').toLowerCase();
        const phrase2 = words.slice(i + len, i + 2 * len).join(' ').toLowerCase();

        // Strip punctuation for matching comparison
        const clean1 = phrase1.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, '').trim();
        const clean2 = phrase2.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, '').trim();

        if (clean1 && clean1 === clean2) {
          // Remove second occurrence
          words.splice(i + len, len);
          text = words.join(' ');
          changed = true;
          break;
        }
      }
      if (changed) break;
    }
  }

  return text.trim();
};

/**
 * Normalizes an action item title:
 * 1. Removes repetitive phrases or stutter from speech recognition.
 * 2. Strips redundant speaker prefixes (e.g. "Speaker:") or assignee boilerplate:
 *    "Rahul will complete the assessment by 28 October" -> "Complete the assessment by 28 October"
 * 3. Preserves full meaning and deadline.
 * 4. Capitalizes the first character cleanly.
 *
 * @param {string} rawTitle - Raw extracted title/sentence
 * @param {string} [assigneeName] - Optional extracted assignee name
 * @returns {string} Clean, normalized action item title
 */
const cleanActionTitle = (rawTitle, assigneeName = '') => {
  if (!rawTitle || typeof rawTitle !== 'string') return '';

  // 1. Remove consecutive duplicates (e.g. "Rahul will complete the Rahul will complete the...")
  let title = removeConsecutiveDuplicatePhrases(rawTitle);

  // 2. Strip leading speaker label if present (e.g. "Yukti Agarwal: ", "Host: ")
  title = title.replace(/^[A-Za-z0-9\s()]+?:\s*/, '');

  // 3. Strip leading assignment prefixes if followed by an action verb:
  // e.g., "Rahul will ", "Aman should ", "We need to ", "I will ", "Please ", "Kindly "
  const prefixPatterns = [
    // Strip common assignment prefixes but keep first‑person "I will" phrasing
    // Exclude "I" from this pattern so that "I will" remains part of the title.
    /^(?:[A-Z][a-z]+|we|someone|everyone|team)\s+(?:will|should|needs to|need to|must|has to|have to|is to|to|is assigned to|is going to|shall)\s+/i,
    /^(?:please|kindly)\s+/i,
  ];

  if (assigneeName && typeof assigneeName === 'string' && assigneeName !== 'Unassigned') {
    const escaped = assigneeName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    prefixPatterns.unshift(new RegExp(`^${escaped}\\s+(?:will|should|needs to|need to|must|has to|is to|to|is assigned to|is going to|shall)?\\s*`, 'i'));
  }

  for (const pat of prefixPatterns) {
    if (pat.test(title)) {
      const stripped = title.replace(pat, '').trim();
      // Ensure we haven't stripped too much (at least 4 characters left)
      if (stripped.length >= 4) {
        title = stripped;
        break;
      }
    }
  }

  // 4. Strip trailing punctuation (but keep a final period later)
  title = title.replace(/[.;,]+$/,'').trim();

  // 5. Capitalize first letter
  if (title.length > 0) {
    title = title.charAt(0).toUpperCase() + title.slice(1);
  }

  // 6. Ensure title ends with a period (if not already ending with punctuation)
  if (title && !/[.!?]$/.test(title)) {
    title = `${title}.`;
  }

  // 7. Fallback if title became too short
  if (title.length < 4) {
    title = removeConsecutiveDuplicatePhrases(rawTitle).trim();
  }

  return title;
};

/**
 * Generates a canonical lowercase string for deduplicating action items.
 * @param {string} title
 * @returns {string}
 */
const normalizeTitle = (title) => {
  if (!title || typeof title !== 'string') return '';
  return cleanActionTitle(title)
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

module.exports = {
  removeConsecutiveDuplicatePhrases,
  cleanActionTitle,
  normalizeTitle,
};
