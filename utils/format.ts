/**
 * Format a number as Vietnamese currency (VND)
 * @param amount - The number to format
 * @returns Formatted string with VND currency
 */
export const formatVND = (amount: number): string => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

/**
 * Format a number with Vietnamese locale (for general numbers, not currency)
 * @param num - The number to format
 * @returns Formatted string with Vietnamese locale
 */
export const formatNumber = (num: number): string => {
  return num.toLocaleString('vi-VN');
};

/**
 * Format date to DD/MM/YYYY format
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns Formatted date string in DD/MM/YYYY format
 */
export const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-');
  return `${day}/${month}/${year}`;
};

/**
 * Format date and time to Vietnamese locale
 * @param dateString - Date string
 * @returns Formatted date and time string
 */
export const formatDateTime = (dateString: string): string => {
  if (!dateString) return 'N/A';

  let date: Date;
  if (dateString.includes('T')) {
    date = new Date(dateString);
  } else {
    date = new Date(dateString + 'T' + new Date().toTimeString().split(' ')[0]);
  }

  return date.toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Convert number to Vietnamese words (improved version)
 * @param num - Number to convert
 * @returns Vietnamese words representation
 */
export const numberToWords = (num: number): string => {
  if (num === 0) return 'không';
  if (num < 0) return 'âm ' + numberToWords(-num);

  const units = ['', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
  const teens = ['mười', 'mười một', 'mười hai', 'mười ba', 'mười bốn', 'mười lăm', 'mười sáu', 'mười bảy', 'mười tám', 'mười chín'];
  const tens = ['', '', 'hai mươi', 'ba mươi', 'bốn mươi', 'năm mươi', 'sáu mươi', 'bảy mươi', 'tám mươi', 'chín mươi'];

  const readThreeDigits = (n: number): string => {
    if (n === 0) return '';
    
    let result = '';
    const hundreds = Math.floor(n / 100);
    const remainder = n % 100;
    const tensUnits = remainder;

    if (hundreds > 0) {
      result += units[hundreds] + ' trăm ';
    }

    if (tensUnits > 0) {
      if (tensUnits < 10) {
        if (hundreds > 0) {
          result += 'lẻ ';
        }
        result += units[tensUnits];
      } else if (tensUnits < 20) {
        result += teens[tensUnits - 10];
      } else {
        const ten = Math.floor(tensUnits / 10);
        const unit = tensUnits % 10;
        result += tens[ten];
        if (unit > 0) {
          result += ' ' + (unit === 5 ? 'lăm' : unit === 1 ? 'mốt' : units[unit]);
        }
      }
    } else if (hundreds > 0) {
      result = result.trim();
    }

    return result.trim();
  };

  let result = '';
  const billions = Math.floor(num / 1000000000);
  const millions = Math.floor((num % 1000000000) / 1000000);
  const thousands = Math.floor((num % 1000000) / 1000);
  const remainder = num % 1000;

  if (billions > 0) {
    result += readThreeDigits(billions) + ' tỷ ';
  }
  if (millions > 0) {
    result += readThreeDigits(millions) + ' triệu ';
  }
  if (thousands > 0) {
    result += readThreeDigits(thousands) + ' nghìn ';
  }
  if (remainder > 0) {
    result += readThreeDigits(remainder);
  }

  return result.trim();
};

/**
 * Convert amount to Vietnamese words with currency
 * @param amount - Amount to convert
 * @returns Vietnamese words with "Việt Nam đồng" suffix
 */
export const amountToWords = (amount: number): string => {
  const words = numberToWords(amount);
  return words ? words + ' Việt Nam đồng' : 'không Việt Nam đồng';
};

/**
 * Convert amount to Vietnamese words with currency (capitalized)
 * @param amount - Amount to convert
 * @returns Vietnamese words with "Việt Nam đồng" suffix, first letter capitalized
 */
export const amountToWordsCapitalized = (amount: number): string => {
  const words = amountToWords(amount);
  return words.charAt(0).toUpperCase() + words.slice(1);
};