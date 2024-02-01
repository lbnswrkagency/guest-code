import { useState, useEffect, useCallback, useMemo } from "react";
import moment from "moment";

const startingEventString = "14012024";
const startingEventDate = moment(startingEventString, "DDMMYYYY");

export const useCurrentEvent = () => {
  const [currentDate, setCurrentDate] = useState(moment());

  const findNextEventDate = (date) => {
    let nextEventDate = startingEventDate.clone();
    while (true) {
      if (
        nextEventDate.isAfter(date, "day") ||
        (nextEventDate.isSame(date, "day") && date.hour() >= 6)
      ) {
        break;
      }
      nextEventDate.add(1, "weeks");
    }
    return nextEventDate;
  };

  const resetEventDateToToday = useCallback(() => {
    const today = moment();
    const nextEventDate = findNextEventDate(today);
    setCurrentDate(nextEventDate);
  }, []);

  const getCurrentEventDate = () => {
    let nearestSunday = currentDate.clone().startOf("week");
    if (
      currentDate.clone().startOf("day").isSame(nearestSunday) &&
      currentDate.hour() < 6
    ) {
      nearestSunday.subtract(7, "days");
    }
    let eventDate = nearestSunday.isBefore(startingEventDate)
      ? startingEventDate
      : findNextEventDate(nearestSunday);
    // Set the event start time to 11 PM
    eventDate.hour(23).minute(0).second(0);
    return eventDate;
  };

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

  // Add console logs
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
