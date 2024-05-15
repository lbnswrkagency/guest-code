import { useState, useEffect, useCallback, useMemo } from "react";
import moment from "moment";

const startingEventString = "15052024"; // Date of the first event
const startingEventDate = moment(startingEventString, "DDMMYYYY");
const eventStartTime = { hour: 21, minute: 0 }; // Event starts at 9 PM
const eventEndTime = { hour: 6, minute: 0 }; // Event ends at 6 AM the next day

export const useCurrentEvent = () => {
  const [currentDate, setCurrentDate] = useState(moment());
  const findNextEventDate = (date) => {
    let eventDate = startingEventDate.clone();
    while (eventDate.add(7, "days").isBefore(date, "day")) {
      // Loop until the event date is not past the given date
    }
    return eventDate.subtract(7, "days"); // Subtract the last added week to get the correct event date
  };

  const resetEventDateToToday = useCallback(() => {
    const today = moment();
    const nextEventDate = findNextEventDate(today);
    setCurrentDate(nextEventDate);
  }, []);

  const getCurrentEventDate = useCallback(() => {
    return findNextEventDate(currentDate);
  }, [currentDate]);

  const calculateDataInterval = (eventDate) => {
    let startDate;
    let endDate = eventDate.clone().add(1, "days").set(eventEndTime);

    if (eventDate.isSame(startingEventDate)) {
      // Special case for the starting event date
      startDate = eventDate.clone().day(1).hour(6); // Set to Monday at 6 AM
    } else {
      // Normal weekly interval for other events
      startDate = eventDate.clone().subtract(1, "weeks").set(eventStartTime);
    }

    return { startDate, endDate };
  };

  const handlePrevWeek = useCallback(() => {
    setCurrentDate((prev) => prev.clone().subtract(1, "weeks"));
  }, []);

  const handleNextWeek = useCallback(() => {
    setCurrentDate((prev) => prev.clone().add(1, "weeks"));
  }, []);

  const currentEventDate = useMemo(() => getCurrentEventDate(), [currentDate]);
  const dataInterval = useMemo(
    () => calculateDataInterval(currentEventDate),
    [currentEventDate]
  );

  console.log(
    "Current Event Date:",
    currentEventDate.format("YYYY-MM-DD HH:mm")
  );
  console.log(
    "Data Interval Start:",
    dataInterval.startDate.format("YYYY-MM-DD HH:mm")
  );
  console.log(
    "Data Interval End:",
    dataInterval.endDate.format("YYYY-MM-DD HH:mm")
  );

  return {
    currentEventDate,
    dataInterval,
    handlePrevWeek,
    handleNextWeek,
    resetEventDateToToday,
  };
};
