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

    // Create lineup HTML
    lineupHtml = `
      <div style="margin-top: 20px; margin-bottom: 20px; background-color: #f8f8f8; border-radius: 8px; padding: 15px;">
        <h3 style="color: ${primaryColor}; margin-top: 0;">Event Lineup</h3>
        ${Object.keys(groupedLineups)
          .map(
            (category) => `
          <div style="margin-bottom: 15px;">
            <h4 style="margin: 0 0 10px; color: #444;">${category}</h4>
            <div style="display: flex; flex-wrap: wrap; gap: 10px;">
              ${groupedLineups[category]
                .map(
                  (artist) => `
                <div style="display: flex; align-items: center; background-color: #fff; border-radius: 5px; padding: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                  ${
                    artist.avatar
                      ? `<img src="${
                          artist.avatar.thumbnail || artist.avatar
                        }" style="width: 30px; height: 30px; border-radius: 50%; margin-right: 8px;">`
                      : `<div style="width: 30px; height: 30px; border-radius: 50%; background-color: ${primaryColor}; color: #fff; display: flex; align-items: center; justify-content: center; margin-right: 8px; font-weight: bold;">${artist.name
                          .charAt(0)
                          .toUpperCase()}</div>`
                  }
                  <span style="font-weight: 500;">${artist.name}</span>
                </div>
              `
                )
                .join("")}
            </div>
          </div>
        `
          )
          .join("")}
      </div>
    `;
  }

  return `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; padding: 20px; background-color: ${primaryColor}; margin-bottom: 20px; border-radius: 8px; color: #222;">
        <h1 style="margin: 0; font-size: 28px;">${eventTitle}</h1>
        ${
          hasValidDate
            ? `<p style="margin: 10px 0 0; font-size: 16px;">${formattedDate.day}, ${formattedDate.date}</p>`
            : ""
        }
      </div>
      
      <p style="font-size: 16px; line-height: 1.5; margin-bottom: 20px;">Hello ${recipientName},</p>
      
      <div style="background-color: #f8f8f8; border-left: 4px solid ${primaryColor}; padding: 15px; margin-bottom: 20px;">
        <p style="font-size: 16px; margin: 0 0 10px; font-weight: bold;">Event Details:</p>
        ${
          hasValidDate
            ? `<p style="font-size: 16px; margin: 0 0 5px;"><strong>📅 Date:</strong> ${formattedDate.day}, ${formattedDate.date}</p>`
            : ""
        }
        <p style="font-size: 16px; margin: 0 0 5px;"><strong>⏰ Time:</strong> ${
          startTime || formattedDate.time
        } - ${endTime || "End"}</p>
        <p style="font-size: 16px; margin: 0 0 5px;"><strong>📍 Location:</strong> ${eventLocation}</p>
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
        <p style="font-size: 16px; line-height: 1.5;">We look forward to seeing you at the event!</p>
        <p style="font-size: 16px; line-height: 1.5;">Best regards,<br>The Event Team</p>
      </div>
      
      <div style="text-align: center; padding: 20px; background-color: #f8f8f8; border-radius: 8px; margin-top: 30px;">
        <p style="font-size: 14px; color: #666; margin: 0;">${footerText}</p>
      </div>
    </div>
  `;
};

module.exports = {
  formatEventDate,
  createEventEmailTemplate,
};
