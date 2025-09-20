/**
 * Phone Number Validation Utilities for TherapEase
 * Specialized for Philippine mobile numbers
 */

/**
 * Validate Philippine mobile number
 * @param {string} phoneNumber - Phone number to validate
 * @returns {Object} - Validation result
 */
function validatePhilippineNumber(phoneNumber) {
  if (!phoneNumber) {
    return { valid: false, error: 'Phone number is required' };
  }

  // Remove all non-digit characters
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // Philippine mobile number patterns
  const patterns = {
    // 09XX-XXX-XXXX (11 digits starting with 09)
    local: /^09[2-9]\d{8}$/,
    // +639XX-XXX-XXXX (13 digits starting with +639)
    international: /^\+639[2-9]\d{8}$/,
    // 639XX-XXX-XXXX (12 digits starting with 639)
    withoutPlus: /^639[2-9]\d{8}$/,
    // 9XX-XXX-XXXX (10 digits starting with 9)
    withoutZero: /^9[2-9]\d{8}$/
  };

  // Check if it's already in international format
  if (phoneNumber.startsWith('+639')) {
    if (patterns.international.test(phoneNumber)) {
      return { 
        valid: true, 
        formatted: phoneNumber,
        type: 'international',
        carrier: getPhilippineCarrier(phoneNumber.substring(4))
      };
    }
  }

  // Check local format (09XX-XXX-XXXX)
  if (patterns.local.test(cleaned)) {
    const formatted = `+63${cleaned.substring(1)}`;
    return { 
      valid: true, 
      formatted,
      type: 'local',
      carrier: getPhilippineCarrier(cleaned.substring(1))
    };
  }

  // Check without + prefix (639XX-XXX-XXXX)
  if (patterns.withoutPlus.test(cleaned)) {
    const formatted = `+${cleaned}`;
    return { 
      valid: true, 
      formatted,
      type: 'without_plus',
      carrier: getPhilippineCarrier(cleaned.substring(2))
    };
  }

  // Check without 0 prefix (9XX-XXX-XXXX)
  if (patterns.withoutZero.test(cleaned)) {
    const formatted = `+63${cleaned}`;
    return { 
      valid: true, 
      formatted,
      type: 'without_zero',
      carrier: getPhilippineCarrier(cleaned)
    };
  }

  return { 
    valid: false, 
    error: 'Invalid Philippine mobile number format',
    suggestions: [
      'Use format: 09XX-XXX-XXXX',
      'Use format: +639XX-XXX-XXXX',
      'Use format: 639XX-XXX-XXXX',
      'Use format: 9XX-XXX-XXXX'
    ]
  };
}

/**
 * Get Philippine mobile carrier from number
 * @param {string} number - 9-digit mobile number (without country code)
 * @returns {string} - Carrier name
 */
function getPhilippineCarrier(number) {
  if (!number || number.length !== 9) return 'Unknown';
  
  const prefix = number.substring(0, 3);
  
  // Globe/TM prefixes
  const globePrefixes = ['905', '906', '915', '916', '917', '926', '927', '935', '936', '937', '975', '977', '978', '979', '995', '996', '997'];
  
  // Smart/TNT prefixes
  const smartPrefixes = ['908', '918', '919', '920', '921', '928', '929', '930', '931', '938', '939', '940', '946', '947', '948', '949', '950', '951', '960', '961', '962', '963', '964', '965', '966', '967', '968', '969', '980', '981', '982', '983', '984', '985', '986', '987', '988', '989', '990', '991', '992', '993', '994', '998', '999'];
  
  // DITO prefixes
  const ditoPrefixes = ['895', '896', '897', '898', '899'];
  
  if (globePrefixes.includes(prefix)) {
    return 'Globe/TM';
  } else if (smartPrefixes.includes(prefix)) {
    return 'Smart/TNT';
  } else if (ditoPrefixes.includes(prefix)) {
    return 'DITO';
  } else {
    return 'Unknown';
  }
}

/**
 * Format Philippine phone number for display
 * @param {string} phoneNumber - Phone number to format
 * @returns {string} - Formatted phone number
 */
function formatPhilippineDisplay(phoneNumber) {
  const validation = validatePhilippineNumber(phoneNumber);
  
  if (!validation.valid) {
    return phoneNumber;
  }
  
  const number = validation.formatted.substring(3); // Remove +63
  return `+63 ${number.substring(0, 3)} ${number.substring(3, 6)} ${number.substring(6)}`;
}

/**
 * Get all valid Philippine mobile number formats
 * @returns {Array} - Array of valid formats
 */
function getValidPhilippineFormats() {
  return [
    '09XX-XXX-XXXX (Local format)',
    '+639XX-XXX-XXXX (International format)',
    '639XX-XXX-XXXX (Without + prefix)',
    '9XX-XXX-XXXX (Without 0 prefix)'
  ];
}

/**
 * Test Philippine phone number with examples
 * @returns {Array} - Test results
 */
function testPhilippineNumbers() {
  const testNumbers = [
    '09123456789',     // Valid local
    '0912-345-6789',   // Valid with dashes
    '0912 345 6789',   // Valid with spaces
    '+639123456789',   // Valid international
    '639123456789',    // Valid without +
    '9123456789',      // Valid without 0
    '08123456789',     // Invalid (08)
    '07123456789',     // Invalid (07)
    '123456789',       // Invalid (too short)
    '091234567890',    // Invalid (too long)
    'invalid'          // Invalid
  ];

  return testNumbers.map(number => {
    const validation = validatePhilippineNumber(number);
    return {
      input: number,
      valid: validation.valid,
      formatted: validation.formatted,
      carrier: validation.carrier,
      error: validation.error
    };
  });
}

module.exports = {
  validatePhilippineNumber,
  getPhilippineCarrier,
  formatPhilippineDisplay,
  getValidPhilippineFormats,
  testPhilippineNumbers
};
