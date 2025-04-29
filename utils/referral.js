/**
 * Generates a random alphanumeric string to be used as a referral code
 * @param {number} length - The length of the referral code
 * @returns {string} The generated referral code
 */
function generateReferralCode(length = 8) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

module.exports = { generateReferralCode };
