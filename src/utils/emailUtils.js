const INVISIBLE_EMAIL_CHARACTERS = /[\u200B-\u200D\uFEFF]/g;

export const normalizeEmailForSubmit = (value = '') => {
  const cleanedEmail = String(value ?? '')
    .replace(INVISIBLE_EMAIL_CHARACTERS, '')
    .trim();
  const emailParts = cleanedEmail.split('@');

  if (emailParts.length !== 2) {
    return cleanedEmail;
  }

  const [localPart, domain] = emailParts;
  return `${localPart}@${domain.toLowerCase()}`;
};
