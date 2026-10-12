/**
 * Utility to generate unique meeting codes (e.g. INT-8F3K29)
 */

const generateMeetingCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'INT-';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

module.exports = { generateMeetingCode };
