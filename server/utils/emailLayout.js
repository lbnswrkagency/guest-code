/**
 * Utility file for creating consistent email layouts for event communications
 */

// Format a date object for display in emails
const formatEventDate = (dateString) => {
  if (!dateString) return { day: "", date: "", time: "" };

  try {
    const date = new Date(dateString);

    // Check if the date is valid
    if (isNaN(date.getTime())) {
      console.error("Invalid date:", dateString);
      return { day: "", date: "", time: "" };
    }

    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    // Format the date parts
    return {
      day: days[date.getDay()],
      date: `${date.getDate()} ${
        months[date.getMonth()]
      } ${date.getFullYear()}`,
      time: date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
    };
  } catch (error) {
    console.error("Error formatting date:", error, dateString);
    return { day: "", date: "", time: "" };
  }
};

// Create event email template
const createEventEmailTemplate = (options) => {
  const {
    recipientName,
    eventTitle,
    eventDate, // This could be either startDate or date from event
    eventLocation,
    eventAddress,
    eventCity,
    eventPostalCode,
    startTime,
    endTime,
    description,
    lineups = [],
    primaryColor = "#ffc807",
    additionalContent = "",
    footerText = "This is an automated email. Please do not reply to this message.",
    showEventDetails = true, // New option to control event details visibility in main section
  } = options;

  // Format date for display
  const formattedDate = formatEventDate(eventDate);

  // Skip date section if no valid date
  const hasValidDate = formattedDate.day && formattedDate.date;

  // Process lineups if available
  let lineupHtml = "";
  if (lineups && lineups.length > 0) {
    // Group lineups by category
    const groupedLineups = lineups.reduce((groups, artist) => {
      const category = artist.category || "Other";
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(artist);
      return groups;
    }, {});

    // Sort categories: DJs first, then by number of artists, then alphabetically
    const sortedCategories = Object.keys(groupedLineups).sort((a, b) => {
      // Always prioritize DJ/DJs category
      if (a.toLowerCase() === "dj" || a.toLowerCase() === "djs") return -1;
      if (b.toLowerCase() === "dj" || b.toLowerCase() === "djs") return 1;

      // Then sort by number of artists (descending)
      const countDiff = groupedLineups[b].length - groupedLineups[a].length;
      if (countDiff !== 0) return countDiff;

      // If same number of artists, sort alphabetically
      return a.localeCompare(b);
    });

    // Create lineup HTML - completely redesigned for email clients
    lineupHtml = `
      <div style="margin-top: 20px; margin-bottom: 20px; background-color: #f8f8f8; border-radius: 8px; padding: 15px;">
        <h3 style="color: ${primaryColor}; margin-top: 0; margin-bottom: 15px; font-size: 18px;">Event Lineup</h3>
        
        <table cellpadding="0" cellspacing="0" border="0" width="100%">
          <tbody>
            ${sortedCategories
              .map(
                (category) => `
                <tr>
                  <td colspan="2" style="padding-top: 15px; padding-bottom: 5px;">
                    <strong style="color: #333; font-size: 16px;">${formatCategoryName(
                      category,
                      groupedLineups[category].length
                    )}</strong>
                  </td>
                </tr>
                ${groupedLineups[category]
                  .map(
                    (artist) => `
                    <tr>
                      <td style="padding: 5px 0;">
                        <table cellpadding="0" cellspacing="0" border="0">
                          <tr>
                            <td width="36" valign="middle">
                              ${
                                artist.avatar
                                  ? `<img src="${getAvatarUrl(
                                      artist.avatar
                                    )}" style="width: 30px; height: 30px; border-radius: 50%;" alt="${
                                      artist.name
                                    }">`
                                  : `<div style="width: 30px; height: 30px; border-radius: 50%; background-color: ${primaryColor}; color: #fff; text-align: center; line-height: 30px; font-weight: bold;">${artist.name
                                      .charAt(0)
                                      .toUpperCase()}</div>`
                              }
                            </td>
                            <td valign="middle" style="padding-left: 8px;">
                              <div style="font-weight: 500; font-size: 14px;">${
                                artist.name
                              }</div>
                            </td>
                            <td valign="middle" style="padding-left: 8px; font-style: italic; color: #666; font-size: 13px;">
                              ${artist.subtitle || ""}
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  `
                  )
                  .join("")}
              `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  return `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; padding: 20px; background-color: ${primaryColor}; margin-bottom: 20px; border-radius: 8px; color: #222;">
        <h1 style="margin: 0; font-size: 28px;">${eventTitle}</h1>
        ${
          hasValidDate && showEventDetails
            ? `<p style="margin: 10px 0 0; font-size: 16px;">${formattedDate.day}, ${formattedDate.date}</p>`
            : ""
        }
      </div>
      
      <p style="font-size: 16px; line-height: 1.5; margin-bottom: 20px;">Hello ${recipientName},</p>
      
      ${
        showEventDetails &&
        (eventLocation || hasValidDate || startTime || eventAddress)
          ? `
      <div style="background-color: #f8f8f8; border-left: 4px solid ${primaryColor}; padding: 15px; margin-bottom: 20px;">
        <p style="font-size: 16px; margin: 0 0 10px; font-weight: bold;">Event Details:</p>
        ${
          hasValidDate
            ? `<p style="font-size: 16px; margin: 0 0 5px;"><strong>📅 Date:</strong> ${formattedDate.day}, ${formattedDate.date}</p>`
            : ""
        }
        ${
          startTime
            ? `<p style="font-size: 16px; margin: 0 0 5px;"><strong>⏰ Time:</strong> ${startTime} - ${
                endTime || "End"
              }</p>`
            : ""
        }
        ${
          eventLocation
            ? `<p style="font-size: 16px; margin: 0 0 5px;"><strong>📍 Location:</strong> ${eventLocation}</p>`
            : ""
        }
        ${
          eventAddress
            ? `<p style="font-size: 16px; margin: 0 0 5px;"><strong>🏢 Address:</strong> ${eventAddress}</p>`
            : ""
        }
        ${
          eventPostalCode || eventCity
            ? `<p style="font-size: 16px; margin: 0 0 5px;"><strong>🏙️ City:</strong> ${
                eventPostalCode ? eventPostalCode + " " : ""
              }${eventCity || ""}</p>`
            : ""
        }
      </div>
      `
          : ""
      }
      
      ${
        description
          ? `
      <div style="margin-bottom: 20px;">
        <h3 style="color: ${primaryColor}; margin-top: 0;">About the Event</h3>
        <p style="font-size: 16px; line-height: 1.5;">${description}</p>
      </div>
      `
          : ""
      }
      
      ${lineupHtml}
      
      ${additionalContent}
      
      <div style="margin-top: 30px;">
        <p style="font-size: 16px; line-height: 1.5;">Best regards,<br>The Event Team</p>
      </div>
      
      <div style="text-align: center; padding: 20px; background-color: #f8f8f8; border-radius: 8px; margin-top: 30px;">
        <p style="font-size: 14px; color: #666; margin: 0;">${footerText}</p>
      </div>
    </div>
  `;
};

// Helper function to pluralize category names
function formatCategoryName(category, count) {
  if (count <= 1) return category.toUpperCase();

  // Check if the category already ends with 'S'
  if (category.toUpperCase().endsWith("S")) return category.toUpperCase();

  // Special case for categories that need custom pluralization
  if (category.toUpperCase() === "DJ") return "DJS";

  // Default pluralization: add 'S'
  return `${category.toUpperCase()}S`;
}

// Helper function to get the best avatar URL
function getAvatarUrl(avatar) {
  if (typeof avatar === "string") {
    return avatar;
  } else if (avatar.medium) {
    return avatar.medium;
  } else if (avatar.small) {
    return avatar.small;
  } else if (avatar.thumbnail) {
    return avatar.thumbnail;
  } else if (avatar.full) {
    return avatar.full;
  } else if (avatar.large) {
    return avatar.large;
  }
  return "";
}

module.exports = {
  formatEventDate,
  createEventEmailTemplate,
  formatCategoryName,
  getAvatarUrl,
};
