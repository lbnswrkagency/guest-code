import { useState, useEffect, useCallback, useMemo } from "react";
import moment from "moment";

const startingEventString = "14012024";
const startingEventDate = moment(startingEventString, "DDMMYYYY");
const eventStartTime = { hour: 23, minute: 0 }; // Sunday at 11 PM
const eventEndTime = { hour: 6, minute: 0 }; // Monday at 6 AM

export const useCurrentEvent = () => {
  const [currentDate, setCurrentDate] = useState(moment());

  const findNextEventDate = (date) => {
    let nextEventDate = startingEventDate.clone();
    while (true) {
      let eventEndDateTime = nextEventDate.clone().add(1, "days").set({
        hour: eventEndTime.hour,
        minute: eventEndTime.minute,
      });
      if (date.isBefore(eventEndDateTime)) {
        break;
      }
      nextEventDate.add(1, "weeks");
    }
    nextEventDate.set({
      hour: eventStartTime.hour,
      minute: eventStartTime.minute,
      second: 0,
    });
    return nextEventDate;
  };

  const resetEventDateToToday = useCallback(() => {
    const today = moment();
    const nextEventDate = findNextEventDate(today);
    setCurrentDate(nextEventDate);
  }, []);

  const getCurrentEventDate = useCallback(() => {
    // Use 'currentDate' to determine the "view" date, not necessarily today's date
    let viewDate = currentDate;
    let nextEventDate = startingEventDate.clone();

    // Iterate to find the next event date considering the end time at 6 AM relative to the viewDate
    while (true) {
      let eventEndTime = nextEventDate.clone().add(1, "days").hour(6);
      if (eventEndTime.isAfter(viewDate, "day")) {
        // Compare strictly by day to allow for navigation logic
        break; // Found the next event that hasn't ended yet according to the viewDate
      }
      nextEventDate.add(1, "weeks");
    }

    // Set the event start time to 11 PM for the found date
    nextEventDate.hour(23).minute(0).second(0);

    return nextEventDate;
  }, [currentDate]); // Ensure this recalculates when currentDate changes due to navigation

  const calculateDataInterval = (eventDate) => {
    let startDate = eventDate
      .clone()
      .subtract(1, "weeks")
      .day("Monday")
      .hour(6);
    let endDate = eventDate.clone().add(1, "days").hour(6);
    return { startDate, endDate };
  };
  // useCallback to memoize handlePrevWeek and handleNextWeek
  const handlePrevWeek = useCallback(() => {
    setCurrentDate((prev) => prev.clone().subtract(1, "weeks"));
  }, []);

  const handleNextWeek = useCallback(() => {
    setCurrentDate((prev) => prev.clone().add(1, "weeks"));
  }, []);

  // useMemo to memoize currentEventDate
  const currentEventDate = useMemo(() => getCurrentEventDate(), [currentDate]);

  // useMemo to memoize dataInterval
  const dataInterval = useMemo(
    () => calculateDataInterval(currentEventDate),
    [currentEventDate]
  );

  // console.log(
  //   "Current Event Date:",
  //   currentEventDate.format("dddd, MMMM Do YYYY, h:mm a")
  // );
  // console.log(
  //   "Data Interval Start:",
  //   dataInterval.startDate.format("dddd, MMMM Do YYYY, h:mm a")
  // );
  // console.log(
  //   "Data Interval End:",
  //   dataInterval.endDate.format("dddd, MMMM Do YYYY, h:mm a")
  // );

  return {
    currentEventDate,
    dataInterval,
    handlePrevWeek,
    handleNextWeek,
    resetEventDateToToday,
  };
};
