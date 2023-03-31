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
