import { useState, useEffect, useCallback, useMemo } from "react";
import moment from "moment";

const startingEventString = "13102024"; // Date of the first event
const startingEventDate = moment(startingEventString, "DDMMYYYY");
const eventStartTime = { hour: 21, minute: 0 }; // Event starts at 11 PM
const eventEndTime = { hour: 6, minute: 0 }; // Event ends at 6 AM the next day
const testMode = false; // Set to true for testing with a specific date and time
const testDateTime = "2024-05-23 06:01"; // Set the test date and time
const startingEventLookbackDays = 12; // Number of days to look back for the starting event

export const useCurrentEvent = () => {
  const [currentDate, setCurrentDate] = useState(
    testMode ? moment(testDateTime) : moment()
  );

  const findCurrentEventDate = useCallback((date) => {
    let eventDate = startingEventDate.clone();
    while (true) {
      const eventEndMoment = eventDate.clone().add(1, "days").set(eventEndTime);
      if (date.isBefore(eventEndMoment)) {
        break;
      }
      eventDate.add(7, "days");
    }
    const eventStartMoment = eventDate.clone().set(eventStartTime);
    const eventEndMoment = eventDate.clone().add(1, "days").set(eventEndTime);
    if (date.isBetween(eventStartMoment, eventEndMoment, null, "[]")) {
      return eventDate;
    } else {
      return eventDate;
    }
  }, []);

  const resetEventDateToToday = useCallback(() => {
    const today = testMode ? moment(testDateTime) : moment();
    setCurrentDate(today);
  }, []);

  const getCurrentEventDate = useCallback(() => {
    return findCurrentEventDate(currentDate);
  }, [currentDate, findCurrentEventDate]);

  const calculateDataInterval = useCallback(
    (currentMoment) => {
      const currentEventDate = findCurrentEventDate(currentMoment);
      const eventStartMoment = currentEventDate.clone().set(eventStartTime);
      const eventEndMoment = currentEventDate
        .clone()
        .add(1, "days")
        .set(eventEndTime);

      let startDate;
      if (currentEventDate.isSame(startingEventDate, "day")) {
        startDate = eventEndMoment
          .clone()
          .subtract(startingEventLookbackDays, "days");
      } else {
        startDate = eventEndMoment.clone().subtract(7, "days");
      }

      const endDate = eventEndMoment;
      return { startDate, endDate };
    },
    [findCurrentEventDate]
  );

  const handlePrevWeek = useCallback(() => {
    setCurrentDate((prev) => prev.clone().subtract(1, "weeks"));
  }, []);

  const handleNextWeek = useCallback(() => {
    setCurrentDate((prev) => prev.clone().add(1, "weeks"));
  }, []);

  const currentEventDate = useMemo(
    () => getCurrentEventDate(),
    [getCurrentEventDate]
  );

  const dataInterval = useMemo(
    () => calculateDataInterval(currentDate),
    [currentDate, calculateDataInterval]
  );

  // console.log("Current Date:", currentDate.format("YYYY-MM-DD HH:mm"));
  // console.log(
  //   "Current Event Date:",
  //   currentEventDate.format("YYYY-MM-DD HH:mm")
  // );
  // console.log(
  //   "Data Interval Start:",
  //   dataInterval.startDate.format("YYYY-MM-DD HH:mm")
  // );
  // console.log(
  //   "Data Interval End:",
  //   dataInterval.endDate.format("YYYY-MM-DD HH:mm")
  // );

  return {
    currentEventDate,
    dataInterval,
    handlePrevWeek,
    handleNextWeek,
    resetEventDateToToday,
  };
};
