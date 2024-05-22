import { useState, useEffect, useCallback, useMemo } from "react";
import moment from "moment";

const startingEventString = "15052024"; // Date of the first event
const startingEventDate = moment(startingEventString, "DDMMYYYY");
const eventStartTime = { hour: 21, minute: 0 }; // Event starts at 9 PM
const eventEndTime = { hour: 6, minute: 0 }; // Event ends at 6 AM the next day

export const useCurrentEvent = () => {
  const [currentDate, setCurrentDate] = useState(moment());

  const findCurrentEventDate = (date) => {
    let eventDate = startingEventDate.clone();

    console.log(
      "Finding current event date for:",
      date.format("YYYY-MM-DD HH:mm")
    );

    while (eventDate.isBefore(date, "day") || eventDate.isSame(date, "day")) {
      console.log("Checking event date:", eventDate.format("YYYY-MM-DD"));
      eventDate.add(7, "days");
    }

    const eventStartMoment = eventDate.clone().set(eventStartTime);
    const eventEndMoment = eventDate.clone().add(1, "days").set(eventEndTime);

    console.log(
      "Event start moment:",
      eventStartMoment.format("YYYY-MM-DD HH:mm")
    );
    console.log("Event end moment:", eventEndMoment.format("YYYY-MM-DD HH:mm"));

    if (date.isBetween(eventStartMoment, eventEndMoment, null, "[]")) {
      console.log("Current date is within the event range");
      return eventDate;
    } else {
      console.log("Current date is outside the event range");
      return eventDate.subtract(7, "days");
    }
  };

  const resetEventDateToToday = useCallback(() => {
    const today = moment();
    console.log(
      "Resetting event date to today:",
      today.format("YYYY-MM-DD HH:mm")
    );
    setCurrentDate(today);
  }, []);

  const getCurrentEventDate = useCallback(() => {
    console.log("Getting current event date");
    return findCurrentEventDate(currentDate);
  }, [currentDate]);

  const calculateDataInterval = (currentMoment) => {
    const currentEventDate = findCurrentEventDate(currentMoment);
    const eventStartMoment = currentEventDate.clone().set(eventStartTime);
    const eventEndMoment = currentEventDate
      .clone()
      .add(1, "days")
      .set(eventEndTime);

    const startDate = eventEndMoment.clone().subtract(7, "days");
    const endDate = eventEndMoment;

    console.log(
      "Calculating data interval for current moment:",
      currentMoment.format("YYYY-MM-DD HH:mm")
    );
    console.log("Current event date:", currentEventDate.format("YYYY-MM-DD"));
    console.log("Data interval start:", startDate.format("YYYY-MM-DD HH:mm"));
    console.log("Data interval end:", endDate.format("YYYY-MM-DD HH:mm"));

    return { startDate, endDate };
  };

  const handlePrevWeek = useCallback(() => {
    setCurrentDate((prev) => {
      const newDate = prev.clone().subtract(1, "weeks");
      console.log(
        "Handling previous week, new date:",
        newDate.format("YYYY-MM-DD HH:mm")
      );
      return newDate;
    });
  }, []);

  const handleNextWeek = useCallback(() => {
    setCurrentDate((prev) => {
      const newDate = prev.clone().add(1, "weeks");
      console.log(
        "Handling next week, new date:",
        newDate.format("YYYY-MM-DD HH:mm")
      );
      return newDate;
    });
  }, []);

  const currentEventDate = useMemo(() => getCurrentEventDate(), [currentDate]);
  const dataInterval = useMemo(
    () => calculateDataInterval(currentDate),
    [currentDate]
  );

  console.log("Current Date:", currentDate.format("YYYY-MM-DD HH:mm"));
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
