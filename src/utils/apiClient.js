// src/utils/apiClient.js
import axios from "axios";

export const createEvent = async (eventData) => {
  try {
    const response = await axios.post("/api/events", eventData);
    return response.data;
  } catch (error) {
    console.error("Error creating event:", error);
    throw error;
  }
};

export const getAllEvents = async () => {
  try {
    const response = await axios.get("/api/events");
    return response.data.events;
  } catch (error) {
    console.error("Error fetching events:", error);
    throw error;
  }
};

export const editEvent = async (eventId, eventData) => {
  try {
    const response = await axios.put(`/api/events/${eventId}`, eventData);
    return response.data.event;
  } catch (error) {
    console.error("Error editing event:", error);
    throw error;
  }
};

export const deleteEvent = async (eventId) => {
  try {
    await axios.delete(`/api/events/${eventId}`);
  } catch (error) {
    console.error("Error deleting event:", error);
    throw error;
  }
};

export const getEventById = async (eventId) => {
  try {
    const response = await axios.get(`/api/events/${eventId}`);
    return response.data.event;
  } catch (error) {
    console.error("Error fetching event by ID:", error);
    throw error;
  }
};

export const getEventByLink = async (eventLink) => {
  try {
    const response = await axios.get(`/api/events/link/${eventLink}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching event by link:", error);
    throw error;
  }
};

export const generateGuestCode = async (guestCodeData) => {
  try {
    const response = await axios.post("/api/guest-codes", guestCodeData);
    return response.data.guestCode;
  } catch (error) {
    console.error("Error generating guest code:", error);
    throw error;
  }
};

export const updateGuestCodeCondition = async (eventId, guestCodeCondition) => {
  try {
    const response = await axios.patch(
      `/api/events/updateGuestCodeCondition/${eventId}`,
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

// apiClient.js

export const compressAndOptimizeFiles = async (eventData) => {
  console.log(eventData);
  try {
    const formData = new FormData();

    for (const format in eventData.flyer) {
      if (eventData.flyer[format]) {
        formData.append(
          `flyer.${format}`, // Update this line
          dataURLtoFile(eventData.flyer[format], `flyer_${format}.jpeg`)
        );
      }
    }

    for (const format in eventData.video) {
      if (eventData.video[format]) {
        formData.append(
          `video.${format}`, // Update this line
          dataURLtoFile(eventData.video[format], `video_${format}.mp4`)
        );
      }
    }

    formData.append("eventData", JSON.stringify(eventData));

    const response = await axios.post(
      "/api/events/compressAndOptimizeFiles",
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
