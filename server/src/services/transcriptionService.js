/**
 * Service to process and format live and batch meeting transcriptions.
 */

const formatTranscriptEntries = (entries = []) => {
  return entries.map(e => ({
    speaker: e.speaker || 'Participant',
    text: e.text || '',
    timestamp: e.timestamp || new Date().toISOString(),
  }));
};

const convertTranscriptToPlainText = (entries = []) => {
  return entries
    .map(e => `[${e.timestamp || '00:00'}] ${e.speaker}: ${e.text}`)
    .join('\n');
};

module.exports = {
  formatTranscriptEntries,
  convertTranscriptToPlainText,
};
