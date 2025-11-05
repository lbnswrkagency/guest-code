/**
 * Generate Dropbox folder path based on brand base folder, path structure, and event date
 * Format: {brandDropboxBaseFolder}{pathStructure with replaced placeholders}
 */
export const generateDropboxPath = (brandDropboxBaseFolder, eventDate, pathStructure = "/Events/{DDMMYY}/photos") => {
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
  
  // Always append /raw at the end for photo access
  const finalPath = `${basePath}${structurePath}`;
  return finalPath.endsWith('/raw') ? finalPath : `${finalPath}/raw`;
};

/**
 * Parse date folder from a dropbox path
 * Returns the date folder (DDMMYY) if found, null otherwise
 */
export const parseDateFromDropboxPath = (dropboxPath) => {
  if (!dropboxPath) return null;
  
  const match = dropboxPath.match(/\/Events\/(\d{6})\/photos/);
  return match ? match[1] : null;
};

/**
 * Convert date folder (DDMMYY) to a readable date
 */
export const dateFromFolder = (dateFolder) => {
  if (!dateFolder || dateFolder.length !== 6) return null;
  
  const day = parseInt(dateFolder.substring(0, 2));
  const month = parseInt(dateFolder.substring(2, 4)) - 1; // JS months are 0-indexed
  const year = parseInt("20" + dateFolder.substring(4, 6));
  
  return new Date(year, month, day);
};

/**
 * Check if a dropbox path matches the expected format
 */
export const isValidDropboxPath = (path) => {
  if (!path) return false;
  return /^\/[^\/]+\//.test(path); // Basic validation - starts with /folder/
};

/**
 * Validate path structure template
 */
export const isValidPathStructure = (pathStructure) => {
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
export const getAvailablePlaceholders = () => {
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
 * Preview path structure with sample date
 */
export const previewPathStructure = (pathStructure, sampleDate = new Date()) => {
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
  
  return preview;
};

/**
 * Extract all possible date patterns from a dropbox path
 * Returns array of found date patterns with their positions
 */
export const extractDatePatternsFromPath = (path) => {
  if (!path) return [];
  
  const patterns = [
    { regex: /(\d{2})(\d{2})(\d{4})/g, format: 'DDMMYYYY', length: 8 },
    { regex: /(\d{2})(\d{2})(\d{2})/g, format: 'DDMMYY', length: 6 },
    { regex: /(\d{4})(\d{2})(\d{2})/g, format: 'YYYYMMDD', length: 8 },
    { regex: /(\d{4})/g, format: 'YYYY', length: 4 },
  ];
  
  const foundPatterns = [];
  
  patterns.forEach(pattern => {
    let match;
    const regex = new RegExp(pattern.regex.source, 'g');
    while ((match = regex.exec(path)) !== null) {
      foundPatterns.push({
        match: match[0],
        format: pattern.format,
        start: match.index,
        end: match.index + pattern.length,
        length: pattern.length
      });
    }
  });
  
  // Sort by position and length (prefer longer matches)
  return foundPatterns.sort((a, b) => {
    if (a.start === b.start) {
      return b.length - a.length; // Prefer longer matches at same position
    }
    return a.start - b.start;
  });
};

/**
 * Replace date in path with new date, preserving the original format
 * This is the smart logic that can handle any path structure
 */
export const replaceDateInPath = (originalPath, newDate) => {
  if (!originalPath || !newDate) return originalPath;
  
  const date = new Date(newDate);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear());
  const year2 = String(date.getFullYear()).slice(-2);
  
  // Extract date patterns from the original path
  const patterns = extractDatePatternsFromPath(originalPath);
  
  if (patterns.length === 0) {
    return originalPath; // No date patterns found, return original
  }
  
  // Use the first (and usually most significant) date pattern found
  const pattern = patterns[0];
  let replacement = '';
  
  switch (pattern.format) {
    case 'DDMMYYYY':
      replacement = `${day}${month}${year}`;
      break;
    case 'DDMMYY':
      replacement = `${day}${month}${year2}`;
      break;
    case 'MMDDYY':
      replacement = `${month}${day}${year2}`;
      break;
    case 'MMDDYYYY':
      replacement = `${month}${day}${year}`;
      break;
    case 'YYYYMMDD':
      replacement = `${year}${month}${day}`;
      break;
    case 'YYYY':
      replacement = year;
      break;
    default:
      replacement = `${day}${month}${year2}`; // Default to DDMMYY
  }
  
  // Replace the first occurrence of the pattern
  const beforePattern = originalPath.substring(0, pattern.start);
  const afterPattern = originalPath.substring(pattern.end);
  
  return beforePattern + replacement + afterPattern;
};

/**
 * Generate smart dropbox path suggestion based on previous events
 * Falls back to brand template if no previous events found
 */
export const generateSmartDropboxPath = (brandEvents = [], currentEventDate, brandDropboxBaseFolder, brandPathStructure) => {
  if (!currentEventDate) {
    return "";
  }
  
  // Find the most recent event (excluding current one) that has a dropboxFolderPath
  const eventsWithDropboxPath = brandEvents
    .filter(event => 
      event.dropboxFolderPath && 
      event.dropboxFolderPath.trim() !== "" &&
      new Date(event.startDate || event.date) <= new Date() // Only past events
    )
    .sort((a, b) => new Date(b.startDate || b.date) - new Date(a.startDate || a.date));
  
  if (eventsWithDropboxPath.length > 0) {
    // Use the most recent event's path as template and replace the date
    const recentEvent = eventsWithDropboxPath[0];
    const smartPath = replaceDateInPath(recentEvent.dropboxFolderPath, currentEventDate);
    console.log('🎯 Smart path generated from recent event:', {
      recentEventPath: recentEvent.dropboxFolderPath,
      recentEventDate: recentEvent.startDate || recentEvent.date,
      currentEventDate: currentEventDate,
      smartPath: smartPath
    });
    return smartPath;
  }
  
  // Fallback to brand template method
  console.log('📋 No previous events found, falling back to brand template');
  return generateDropboxPath(brandDropboxBaseFolder, currentEventDate, brandPathStructure);
};