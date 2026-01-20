import { useState, useEffect, useMemo } from "react";

/**
 * Custom hook to manage action buttons data loading state
 * Centralizes all data dependencies for action buttons to prevent staggered appearance
 */
const useActionButtonsData = ({
  currentEvent,
  ticketSettings,
  codeSettings,
  actuallyHasPhotos,
  checkingGalleries,
  supportsTableBooking,
  supportsBattles,
}) => {
  // Track individual data loading states
  const [dataLoadingState, setDataLoadingState] = useState({
    event: false,
    tickets: false,
    codes: false,
    photos: false,
  });

  // Update data loading state based on dependencies
  useEffect(() => {
    setDataLoadingState({
      event: !!currentEvent,
      tickets: !!ticketSettings && ticketSettings.length >= 0, // tickets can be empty array
      codes: !!codeSettings && codeSettings.length >= 0, // codes can be empty array
      photos: actuallyHasPhotos !== null, // null = not checked yet
    });
  }, [
    currentEvent,
    ticketSettings,
    codeSettings,
    actuallyHasPhotos,
  ]);

  // Calculate if all essential data is loaded
  const isDataLoaded = useMemo(() => {
    const { event, tickets, codes } = dataLoadingState;
    
    // Essential data: event, tickets, and codes must be loaded
    // Gallery data is optional and can load asynchronously
    return event && tickets && codes;
  }, [dataLoadingState]);

  // Calculate if gallery data is still loading
  const isGalleryDataLoading = useMemo(() => {
    return checkingGalleries;
  }, [checkingGalleries]);

  // Calculate button visibility based on loaded data
  const buttonVisibility = useMemo(() => {
    if (!isDataLoaded) {
      return {
        tickets: false,
        guestCode: false,
        tables: false,
        battles: false,
        photos: false,
      };
    }

    // Filter visible ticket settings (same logic as original)
    const visibleTicketSettings = ticketSettings.filter(
      (ticket) => ticket.isVisible !== false
    );

    // Calculate button visibility using same logic as original component
    const ticketsAvailable =
      currentEvent &&
      currentEvent.ticketsAvailable !== false &&
      visibleTicketSettings.length > 0;

    const guestCodeSetting = codeSettings?.find((cs) => cs.type === "guest");
    const showGuestCode =
      !!currentEvent &&
      guestCodeSetting?.isEnabled &&
      guestCodeSetting?.condition;

    const supportsTableBookingForEvent = supportsTableBooking?.(currentEvent);
    const supportsBattlesForEvent = supportsBattles?.(currentEvent);

    return {
      tickets: !!ticketsAvailable,
      guestCode: !!showGuestCode,
      tables: !!supportsTableBookingForEvent,
      battles: !!supportsBattlesForEvent,
      photos: actuallyHasPhotos === true,
    };
  }, [
    isDataLoaded,
    currentEvent,
    ticketSettings,
    codeSettings,
    actuallyHasPhotos,
    supportsTableBooking,
    supportsBattles,
  ]);

  // Calculate if any action buttons should be shown
  const hasAnyActions = useMemo(() => {
    return Object.values(buttonVisibility).some(Boolean);
  }, [buttonVisibility]);

  return {
    isDataLoaded,
    isGalleryDataLoading,
    dataLoadingState,
    buttonVisibility,
    hasAnyActions,
  };
};

export default useActionButtonsData;