/**
 * Format phone number for display with dashes:
 * - Mobile 10-digit (06x, 08x, 09x): 081-234-5678
 * - Bangkok Landline 9-digit (02): 02-111-2222
 * - Provincial Landline 9-digit (03x, 04x, 05x, 07x): 044-611-221
 */
export function formatPhone(phone) {
  if (!phone) return '-';
  const cleaned = String(phone).replace(/\D/g, '');

  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
  }

  if (cleaned.length === 9) {
    if (cleaned.startsWith('02')) {
      return cleaned.replace(/(\d{2})(\d{3})(\d{4})/, '$1-$2-$3');
    }
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})/, '$1-$2-$3');
  }

  return phone;
}
