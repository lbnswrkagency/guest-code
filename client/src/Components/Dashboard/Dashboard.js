// Dashboard.js
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Dashboard.scss";
import { useSelector } from "react-redux";
import { selectUser } from "../../redux/userSlice";
import { selectAllBrands } from "../../redux/brandSlice";
import { selectAllEvents } from "../../redux/eventsSlice";
import { selectAllRoles, selectUserRoleForBrand } from "../../redux/rolesSlice";
import {
  selectAllCodeSettings,
  selectCodeSettingsByEventId,
} from "../../redux/codeSettingsSlice";
import { selectAllLineups } from "../../redux/lineupSlice";
import { store } from "../../redux/store";
import { logout } from "../AuthForm/Login/LoginFunction";
import Navigation from "../Navigation/Navigation";
import DashboardHeader from "../DashboardHeader/DashboardHeader";
import DashboardMenu from "../DashboardMenu/DashboardMenu";
import DashboardFeed from "../DashboardFeed/DashboardFeed";

const Dashboard = () => {
  const navigate = useNavigate();
  const hasLoggedStore = useRef(false);

  // Get Redux store data
  const user = useSelector(selectUser);
  const brands = useSelector(selectAllBrands);
  const events = useSelector(selectAllEvents);
  const roles = useSelector(selectAllRoles);
  const codeSettings = useSelector(selectAllCodeSettings);
  const lineups = useSelector(selectAllLineups);
  const userRoles = useSelector((state) => state.roles?.userRoles || {});

  // State for selected brand and date
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Single comprehensive log function
  const logAppData = () => {
    // Get persisted data
    let persistedData = null;
    try {
      const persistedDataString = localStorage.getItem("persist:root");
      if (persistedDataString) {
        const parsedData = JSON.parse(persistedDataString);

        persistedData = {
          brands: parsedData.brand
            ? JSON.parse(parsedData.brand).allBrands?.length || 0
            : 0,
          events: parsedData.events
            ? JSON.parse(parsedData.events).allEvents?.length || 0
            : 0,
          roles: parsedData.roles
            ? JSON.parse(parsedData.roles).allRoles?.length || 0
            : 0,
          codeSettings: parsedData.codeSettings
            ? JSON.parse(parsedData.codeSettings).allCodeSettings?.length || 0
            : 0,
          lineups: parsedData.lineup
            ? JSON.parse(parsedData.lineup).allLineups?.length || 0
            : 0,
        };
      }
    } catch (error) {
      persistedData = { error: error.message };
    }

    // Prepare brand data with events and roles
    const brandsData = brands.map((brand) => {
      const brandEvents = events.filter((event) => event.brand === brand._id);
      const userRoleId = userRoles[brand._id];
      const userRole = roles.find((role) => role._id === userRoleId);
      const brandLineups = lineups.filter(
        (lineup) => lineup.brandId === brand._id
      );

      return {
        id: brand._id,
        name: brand.name,
        logo: brand.logo ? true : false,
        eventsCount: brandEvents.length,
        lineupsCount: brandLineups.length,
        role: userRole
          ? {
              id: userRole._id,
              name: userRole.name,
              isFounder: userRole.isFounder,
            }
          : null,
      };
    });

    // Log all data in one comprehensive object
    console.log("🔄 [GuestCode] Application Data:", {
      user: {
        id: user?._id,
        username: user?.username,
        firstName: user?.firstName,
        lastName: user?.lastName,
        email: user?.email,
        hasAvatar: user?.avatar ? true : false,
        isAdmin: user?.isAdmin,
        isVerified: user?.isVerified,
      },
      counts: {
        brands: brands.length,
        events: events.length,
        roles: roles.length,
        codeSettings: codeSettings.length,
        lineups: lineups.length,
      },
      brands: brandsData,
      lineupData: {
        total: lineups.length,
        byBrand: brands
          .map((brand) => {
            const brandLineups = lineups.filter(
              (lineup) => lineup.brandId === brand._id
            );
            return {
              brandId: brand._id,
              brandName: brand.name,
              lineupCount: brandLineups.length,
              lineupCategories: [
                ...new Set(brandLineups.map((l) => l.category)),
              ],
              lineupSample: brandLineups.slice(0, 2).map((l) => ({
                id: l._id,
                name: l.name,
                category: l.category,
                hasAvatar: l.avatar ? true : false,
              })),
            };
          })
          .filter((b) => b.lineupCount > 0),
      },
      persistence: persistedData,
      timestamp: new Date().toISOString(),
    });
  };

  useEffect(() => {
    // Check if user is logged in
    if (!user) {
      navigate("/login");
      return;
    }

    // Log data once
    if (!hasLoggedStore.current) {
      logAppData();
      hasLoggedStore.current = true;
    }
  }, [user, brands, events, roles, codeSettings, navigate]);

  // Find the next upcoming event date
  const findNextUpcomingEventDate = (brandEvents) => {
    if (!brandEvents || brandEvents.length === 0) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of day for accurate comparison

    // Filter for upcoming events (today or later)
    const upcomingEvents = brandEvents.filter((event) => {
      if (!event.date) return false;
      const eventDate = new Date(event.date);
      eventDate.setHours(0, 0, 0, 0); // Set to start of day
      return eventDate >= today;
    });

    if (upcomingEvents.length === 0) return null;

    // Sort by date (ascending)
    upcomingEvents.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Return the date of the closest upcoming event
    const closestEvent = upcomingEvents[0];
    return new Date(closestEvent.date).toISOString().split("T")[0];
  };

  // Set initial selected brand when brands are loaded
  useEffect(() => {
    if (brands.length > 0 && !selectedBrand) {
      // Prepare the first brand with events data
      const firstBrand = brands[0];
      const brandWithData = prepareBrandWithData(firstBrand);
      setSelectedBrand(brandWithData);

      // Find the next upcoming event date for this brand
      const nextEventDate = findNextUpcomingEventDate(brandWithData.events);
      if (nextEventDate) {
        setSelectedDate(nextEventDate);
      }
    }
  }, [brands]);

  // Update selected event when brand or date changes
  useEffect(() => {
    if (selectedBrand && selectedDate) {
      // Find event for the selected date
      const brandEvents = selectedBrand.events || [];
      const formattedDate = new Date(selectedDate).toISOString().split("T")[0];

      const eventForDate = brandEvents.find((event) => {
        if (!event.date) return false;
        const eventDate = new Date(event.date).toISOString().split("T")[0];
        return eventDate === formattedDate;
      });

      setSelectedEvent(eventForDate || null);
    } else {
      setSelectedEvent(null);
    }
  }, [selectedBrand, selectedDate]);

  // Prepare brand with events and role data
  const prepareBrandWithData = (brand) => {
    // Get user's role for this brand
    const userRoleId = userRoles[brand._id];
    const userRole = roles.find((role) => role._id === userRoleId);

    // Get events for this brand
    const brandEvents = events.filter((event) => event.brand === brand._id);

    // Get lineups for this brand
    const brandLineups = lineups.filter(
      (lineup) => lineup.brandId === brand._id
    );

    // Calculate team size
    const teamSize = (brand.team?.length || 0) + (brand.owner ? 1 : 0);

    return {
      ...brand,
      role: userRole,
      events: brandEvents,
      lineups: brandLineups,
      teamSize,
    };
  };

  // Prepare all brands with data
  const brandsWithData = brands.map(prepareBrandWithData);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleBack = () => {
    handleLogout();
  };

  // Handle brand selection
  const handleSelectBrand = (brand) => {
    // Prepare the brand with events data
    const brandWithData = prepareBrandWithData(brand);
    setSelectedBrand(brandWithData);

    // Find the next upcoming event date for the newly selected brand
    const nextEventDate = findNextUpcomingEventDate(brandWithData.events);

    if (nextEventDate) {
      setSelectedDate(nextEventDate);
    } else {
      setSelectedDate(null); // No upcoming events for this brand
    }

    setSelectedEvent(null); // Reset event when brand changes
  };

  // Handle date selection
  const handleSelectDate = (date) => {
    setSelectedDate(date);
  };

  if (!user) return null;

  return (
    <div className="dashboard">
      <Navigation
        onBack={handleBack}
        onMenuClick={() => {}}
        onLogout={handleLogout}
      />
      <div className="dashboard-content">
        <DashboardHeader
          user={user}
          brandsCount={brands.length}
          eventsCount={events.length}
          brands={brandsWithData}
          selectedBrand={selectedBrand}
          setSelectedBrand={handleSelectBrand}
          selectedDate={selectedDate}
          setSelectedDate={handleSelectDate}
        />
        <DashboardMenu />
        <DashboardFeed
          selectedBrand={selectedBrand}
          selectedDate={selectedDate}
          selectedEvent={selectedEvent}
        />
      </div>
    </div>
  );
};

export default Dashboard;
