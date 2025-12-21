// src/utils/apiClient.js
import axios from "axios";

export const createEvent = async (eventData) => {
  try {
    const response = await axios.post(
      `${process.env.REACT_APP_API_BASE_URL}/events`,
      eventData
    );
    return response.data;
  } catch (error) {
    console.error("Error creating event:", error);
    throw error;
  }
};

export const getAllEvents = async () => {
  try {
    const response = await axios.get(
      `${process.env.REACT_APP_API_BASE_URL}/events`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching events:", error);
    throw error;
  }
};

export const editEvent = async (eventId, eventData) => {
  try {
    const response = await axios.put(
      `${process.env.REACT_APP_API_BASE_URL}/events/${eventId}`,
      eventData
    );
    return response.data.event;
  } catch (error) {
    console.error("Error editing event:", error);
    throw error;
  }
};

export const deleteEvent = async (eventId) => {
  try {
    await axios.delete(
      `${process.env.REACT_APP_API_BASE_URL}/events/${eventId}`
    );
  } catch (error) {
    console.error("Error deleting event:", error);
    throw error;
  }
};

export const getEventById = async (eventId) => {
  try {
    const response = await axios.get(
      `${process.env.REACT_APP_API_BASE_URL}/events/${eventId}`
    );
    return response.data.event;
  } catch (error) {
    console.error("Error fetching event by ID:", error);
    throw error;
  }
};

export const getEventByLink = async (eventLink) => {
  try {
    const response = await axios.get(
      `${process.env.REACT_APP_API_BASE_URL}/events/link/${eventLink}`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching event by link:", error);
    throw error;
  }
};

export const generateGuestCode = async (guestCodeData) => {
  try {
    const response = await axios.post(
      `${process.env.REACT_APP_API_BASE_URL}/events`,
      guestCodeData
    );
    return response.data.guestCode;
  } catch (error) {
    console.error("Error generating guest code:", error);
    throw error;
  }
};

export const updateGuestCodeCondition = async (eventId, guestCodeCondition) => {
  try {
    const response = await axios.patch(
      `${process.env.REACT_APP_API_BASE_URL}/events/updateGuestCodeCondition/${eventId}`,
      {
        guestCodeCondition,
      }
    );
    return response.data.event;
  } catch (error) {
    console.error("Error updating guest code condition:", error);
    throw error;
  }
};

export const compressAndOptimizeFiles = async (eventData) => {
  try {
    const formData = new FormData();

    if (eventData.flyer) {
      for (const format in eventData.flyer) {
        if (eventData.flyer[format]) {
          const file =
            eventData.flyer[format] instanceof File ||
            !isDataURL(eventData.flyer[format])
              ? eventData.flyer[format]
              : dataURLtoFile(eventData.flyer[format], `flyer_${format}.jpeg`);

          if (file) {
            formData.append(`flyer.${format}`, file);
          }
        }
      }
    }

    if (eventData.video) {
      for (const format in eventData.video) {
        if (eventData.video[format]) {
          const file =
            eventData.video[format] instanceof File ||
            !isDataURL(eventData.video[format])
              ? eventData.video[format]
              : dataURLtoFile(eventData.video[format], `video_${format}.mp4`);

          if (file) {
            formData.append(`video.${format}`, file);
          }
        }
      }
    }

    formData.append("eventData", JSON.stringify(eventData));

    const response = await axios.post(
      `${process.env.REACT_APP_API_BASE_URL}/events/compressAndOptimizeFiles`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error("Error compressing and optimizing files:", error);
    throw error;
  }
};

function dataURLtoFile(dataurl, filename) {
  if (!dataurl) {
    return null;
  }
  const arr = dataurl.split(",");
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
}

function isDataURL(s) {
  return !!s.match(/^\s*data:([a-zA-Z]+\/[a-zA-Z]+);base64,/);
}
