// Validation helpers for Israeli forms

export const validateIdNumber = (id: string): boolean => {
  if (!id) return true; // optional field
  const cleaned = id.replace(/\D/g, '');
  return cleaned.length === 9;
};

export const validatePhone = (phone: string): boolean => {
  if (!phone) return false; // required
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length === 10;
};

export const getIdError = (id: string): string | null => {
  if (!id) return null;
  const cleaned = id.replace(/\D/g, '');
  if (cleaned.length !== 9) return "תעודת זהות חייבת להכיל 9 ספרות";
  return null;
};

export const getPhoneError = (phone: string): string | null => {
  if (!phone) return "מספר טלפון הוא שדה חובה";
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length !== 10) return "מספר טלפון חייב להכיל 10 ספרות";
  return null;
};
