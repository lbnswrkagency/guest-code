/**
 * Generate Dropbox folder path based on brand base folder, path structure, event date, and optional subfolder
 * Format: {brandDropboxBaseFolder}{pathStructure with replaced placeholders}/{subfolder}
 * @param {string} brandDropboxBaseFolder - Base folder path
 * @param {Date|string} eventDate - Event date
 * @param {string} pathStructure - Path structure with placeholders
 * @param {string} subfolder - Optional subfolder to append at the end (e.g., "branded", "raw")
 */
const generateDropboxPath = (brandDropboxBaseFolder, eventDate, pathStructure = "/{YYYYMMDD}/photos", subfolder = "") => {
  if (!brandDropboxBaseFolder || !eventDate) {
    return "";
  }

  const date = new Date(eventDate);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear());
  const year2 = String(date.getFullYear()).slice(-2);

  // Ensure brandDropboxBaseFolder starts with /
  const basePath = brandDropboxBaseFolder.startsWith('/')
    ? brandDropboxBaseFolder
    : `/${brandDropboxBaseFolder}`;

  // Replace placeholders in the path structure
  let structurePath = pathStructure;
  structurePath = structurePath.replace(/{DDMMYY}/g, `${day}${month}${year2}`);
  structurePath = structurePath.replace(/{DDMMYYYY}/g, `${day}${month}${year}`);
  structurePath = structurePath.replace(/{MMDDYY}/g, `${month}${day}${year2}`);
  structurePath = structurePath.replace(/{MMDDYYYY}/g, `${month}${day}${year}`);
  structurePath = structurePath.replace(/{YYYYMMDD}/g, `${year}${month}${day}`);
  structurePath = structurePath.replace(/{YYYY}/g, year);
  structurePath = structurePath.replace(/{MM}/g, month);
  structurePath = structurePath.replace(/{DD}/g, day);
  structurePath = structurePath.replace(/{YY}/g, year2);

  // Ensure structure path starts with /
  if (!structurePath.startsWith('/')) {
    structurePath = `/${structurePath}`;
  }

  // Build final path
  let finalPath = `${basePath}${structurePath}`;

  // Append subfolder if provided
  if (subfolder && subfolder.trim()) {
    const cleanSubfolder = subfolder.trim().replace(/^\/+/, ''); // Remove leading slashes
    finalPath = `${finalPath}/${cleanSubfolder}`;
  }

  return finalPath;
};

/**
 * Parse date folder from a dropbox path
 * Returns the date folder (DDMMYY) if found, null otherwise
 */
const parseDateFromDropboxPath = (dropboxPath) => {
  if (!dropboxPath) return null;
  
  const match = dropboxPath.match(/\/Events\/(\d{6})\/photos/);
  return match ? match[1] : null;
};

/**
 * Convert date folder (DDMMYY) to a readable date
 */
const dateFromFolder = (dateFolder) => {
  if (!dateFolder || dateFolder.length !== 6) return null;
  
  const day = parseInt(dateFolder.substring(0, 2));
  const month = parseInt(dateFolder.substring(2, 4)) - 1; // JS months are 0-indexed
  const year = parseInt("20" + dateFolder.substring(4, 6));
  
  return new Date(year, month, day);
};

/**
 * Check if a dropbox path matches the expected format
 */
const isValidDropboxPath = (path) => {
  if (!path) return false;
  return /^\/[^\/]+\//.test(path); // Basic validation - starts with /folder/
};

/**
 * Validate path structure template
 */
const isValidPathStructure = (pathStructure) => {
  if (!pathStructure) return false;
  
  // Check for valid placeholders
  const validPlaceholders = [
    '{DDMMYY}', '{DDMMYYYY}', '{MMDDYY}', '{MMDDYYYY}', 
    '{YYYYMMDD}', '{YYYY}', '{MM}', '{DD}', '{YY}'
  ];
  const foundPlaceholders = pathStructure.match(/{[^}]+}/g) || [];
  
  // Check if all placeholders are valid
  const allPlaceholdersValid = foundPlaceholders.every(placeholder => 
    validPlaceholders.includes(placeholder)
  );
  
  // Must contain at least one date placeholder
  const hasDatePlaceholder = foundPlaceholders.some(placeholder => 
    validPlaceholders.includes(placeholder)
  );
  
  return allPlaceholdersValid && hasDatePlaceholder;
};

/**
 * Get available placeholders for path structure
 */
const getAvailablePlaceholders = () => {
  const currentDate = new Date();
  const day = String(currentDate.getDate()).padStart(2, '0');
  const month = String(currentDate.getMonth() + 1).padStart(2, '0');
  const year = String(currentDate.getFullYear());
  const year2 = String(currentDate.getFullYear()).slice(-2);
  
  return [
    {
      placeholder: "{DDMMYY}",
      description: "Day, Month, Year (2-digit)",
      example: `${day}${month}${year2}`
    },
    {
      placeholder: "{DDMMYYYY}",
      description: "Day, Month, Year (4-digit)",
      example: `${day}${month}${year}`
    },
    {
      placeholder: "{MMDDYY}",
      description: "Month, Day, Year (2-digit)",
      example: `${month}${day}${year2}`
    },
    {
      placeholder: "{MMDDYYYY}",
      description: "Month, Day, Year (4-digit)",
      example: `${month}${day}${year}`
    },
    {
      placeholder: "{YYYYMMDD}",
      description: "Year, Month, Day",
      example: `${year}${month}${day}`
    },
    {
      placeholder: "{YYYY}",
      description: "Full Year",
      example: year
    },
    {
      placeholder: "{MM}",
      description: "Month (2-digit)",
      example: month
    },
    {
      placeholder: "{DD}",
      description: "Day (2-digit)",
      example: day
    },
    {
      placeholder: "{YY}",
      description: "Year (2-digit)",
      example: year2
    }
  ];
};

/**
 * Preview path structure with sample date and optional subfolder
 * @param {string} pathStructure - Path structure with placeholders
 * @param {Date} sampleDate - Date to use for preview
 * @param {string} subfolder - Optional subfolder to append
 */
const previewPathStructure = (pathStructure, sampleDate = new Date(), subfolder = "") => {
  if (!pathStructure) return '';

  const date = new Date(sampleDate);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear());
  const year2 = String(date.getFullYear()).slice(-2);

  let preview = pathStructure;
  preview = preview.replace(/{DDMMYY}/g, `${day}${month}${year2}`);
  preview = preview.replace(/{DDMMYYYY}/g, `${day}${month}${year}`);
  preview = preview.replace(/{MMDDYY}/g, `${month}${day}${year2}`);
  preview = preview.replace(/{MMDDYYYY}/g, `${month}${day}${year}`);
  preview = preview.replace(/{YYYYMMDD}/g, `${year}${month}${day}`);
  preview = preview.replace(/{YYYY}/g, year);
  preview = preview.replace(/{MM}/g, month);
  preview = preview.replace(/{DD}/g, day);
  preview = preview.replace(/{YY}/g, year2);

  // Append subfolder if provided
  if (subfolder && subfolder.trim()) {
    const cleanSubfolder = subfolder.trim().replace(/^\/+/, '');
    preview = `${preview}/${cleanSubfolder}`;
  }

  return preview;
};

module.exports = {
  generateDropboxPath,
  parseDateFromDropboxPath,
  dateFromFolder,
  isValidDropboxPath,
  isValidPathStructure,
  getAvailablePlaceholders,
  previewPathStructure
};