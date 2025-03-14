import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import "./Login.scss";
import AuthContext from "../../../contexts/AuthContext";
import Navigation from "../../Navigation/Navigation";
import { useToast } from "../../Toast/ToastContext";
import { useDispatch } from "react-redux";
import { setUser, setLoading, setError } from "../../../redux/userSlice";
import { addEventsToBrand } from "../../../redux/brandSlice";
import Maintenance from "../../Maintenance/Maintenance";
import axiosInstance from "../../../utils/axiosConfig";
import { addRolesForBrand } from "../../../redux/permissionsSlice";
import { store } from "../../../redux/store";

function Login() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const toast = useToast();
  const dispatch = useDispatch();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Helper function to fetch roles for a brand
  const fetchRolesForBrand = async (brandId) => {
    try {
      const response = await axiosInstance.get(
        `/roles/brands/${brandId}/roles`
      );
      if (response.data && Array.isArray(response.data)) {
        // Store roles for this brand in Redux
        dispatch(
          addRolesForBrand({
            brandId,
            roles: response.data,
          })
        );

        return response.data;
      }
    } catch (error) {
      console.error(`Error fetching roles for brand ${brandId}:`, error);
    }
    return [];
  };

  // Helper function to fetch code settings for an event
  const fetchCodeSettingsForEvent = async (eventId, parentEventId) => {
    try {
      // Use parent event ID if this is a child event (as per controller logic)
      const effectiveEventId = parentEventId || eventId;

      console.log(
        `[Login] Fetching code settings for event: ${eventId} (using effectiveId: ${effectiveEventId})`
      );

      // Try the standard endpoint first
      const url = `/code-settings/events/${effectiveEventId}`;
      console.log(`[Login] Requesting code settings: ${url}`);

      let response;
      try {
        response = await axiosInstance.get(url);
        console.log(`[Login] Code settings API success: ${response.status}`);

        // Log detailed response information
        console.log(
          `[Login] Code settings response details for ${effectiveEventId}:`,
          {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
            dataType: typeof response.data,
            isObject: typeof response.data === "object",
            hasCodeSettings:
              response.data && response.data.codeSettings ? true : false,
            dataKeys: response.data ? Object.keys(response.data) : [],
          }
        );
      } catch (error) {
        // Detailed error logging
        console.error(`[Login] First attempt error details:`, {
          message: error.message,
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
        });

        // If that fails, try the alternative endpoint with /api prefix
        console.log(`[Login] Trying alternative endpoint for code settings`);
        try {
          response = await axiosInstance.get(`/api${url}`);
          console.log(
            `[Login] Alternative code settings API success: ${response.status}`
          );

          // Log detailed response information for alternative endpoint
          console.log(`[Login] Alternative endpoint response details:`, {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
            dataType: typeof response.data,
            isObject: typeof response.data === "object",
            hasCodeSettings:
              response.data && response.data.codeSettings ? true : false,
            dataKeys: response.data ? Object.keys(response.data) : [],
          });
        } catch (altError) {
          console.error(
            `[Login] Both endpoints failed for ${effectiveEventId}:`,
            {
              firstErrorMessage: error.message,
              altErrorMessage: altError.message,
              status: altError.response?.status,
              data: altError.response?.data,
            }
          );

          // Try a third approach - direct controller endpoint
          try {
            const directUrl = `/api/code-settings/events/${effectiveEventId}`;
            console.log(
              `[Login] Attempting direct controller endpoint: ${directUrl}`
            );
            response = await axiosInstance.get(directUrl);
            console.log(
              `[Login] Direct controller endpoint success: ${response.status}`
            );
          } catch (directError) {
            console.error(`[Login] All code settings endpoints failed`);
            // Return empty array after all attempts failed
            return [];
          }
        }
      }

      // Extract code settings from response - handle both formats
      if (response.data) {
        // Check if the data has a codeSettings property or is an array directly
        const codeSettingsData = Array.isArray(response.data)
          ? response.data
          : response.data.codeSettings || [];

        console.log(
          `[Login] Found ${codeSettingsData.length} code settings for event ${eventId}`
        );

        // Log the first code setting for debugging if available
        if (codeSettingsData.length > 0) {
          console.log(`[Login] First code setting for event ${eventId}:`, {
            id: codeSettingsData[0]._id || codeSettingsData[0].id,
            type: codeSettingsData[0].type,
            name: codeSettingsData[0].name,
            isEnabled: codeSettingsData[0].isEnabled,
          });
        }

        if (Array.isArray(codeSettingsData) && codeSettingsData.length > 0) {
          // Map settings to ensure consistent format
          const formattedSettings = codeSettingsData.map((setting) => ({
            _id: setting._id || setting.id || "",
            id: setting._id || setting.id || "",
            name: setting.name || "",
            type: setting.type || "",
            isEnabled: setting.isEnabled || false,
            isEditable:
              setting.isEditable !== undefined ? setting.isEditable : false,
            maxPax: setting.maxPax || 1,
            condition: setting.condition || "",
            color: setting.color || "#2196F3", // Use a better default color
            limit: setting.limit || 0,
            unlimited: setting.unlimited || false,
          }));

          console.log(
            `[Login] Formatted ${formattedSettings.length} code settings for event ${eventId}`
          );
          return formattedSettings;
        }
      } else {
        console.warn(
          `[Login] Response exists but no data for code settings - event ${eventId}`
        );
      }
    } catch (error) {
      console.error(
        `[Login] Unhandled error in fetchCodeSettingsForEvent for ${eventId}:`,
        error.message,
        error.stack
      );
    }

    // If we can't fetch real code settings, return empty array
    // (don't create placeholder settings to avoid confusion)
    console.warn(
      `[Login] Returning empty code settings array for event ${eventId}`
    );
    return [];
  };

  // Helper function to fetch events for a brand
  const fetchEventsForBrand = async (brandId) => {
    try {
      console.log(`[Login] Fetching events for brand ${brandId}...`);

      // Step 1: Fetch parent events first
      const url = `/events/brand/${brandId}`;
      console.log(`[Login] Requesting parent events URL: ${url}`);

      const response = await axiosInstance.get(url);

      // Add detailed logging for troubleshooting
      console.log(`[Login] FULL API RESPONSE for ${brandId}:`, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        dataType: typeof response.data,
        data: response.data,
      });

      // Check if response.data is empty but successful
      if (
        response.status === 200 &&
        (!response.data ||
          (Array.isArray(response.data) && response.data.length === 0))
      ) {
        console.log(
          `[Login] WARNING: API returned successful status but empty data for brand ${brandId}`
        );
      }

      if (response.data && Array.isArray(response.data)) {
        // Step 2: For each parent event that is weekly, fetch its child events
        const parentEvents = [...response.data];

        console.log(`[Login] Parent events data:`, {
          count: parentEvents.length,
          firstEvent:
            parentEvents.length > 0
              ? {
                  id: parentEvents[0]._id,
                  title: parentEvents[0].title,
                  hasCodeSettings: !!parentEvents[0].codeSettings,
                }
              : "No events",
        });

        const allEvents = [...parentEvents];

        // Find weekly events that might have children
        const weeklyEvents = parentEvents.filter((event) => event.isWeekly);

        if (weeklyEvents.length > 0) {
          console.log(
            `[Login] Found ${weeklyEvents.length} weekly events, fetching children`
          );

          // Fetch children for each weekly parent event
          for (const weeklyEvent of weeklyEvents) {
            try {
              const childUrl = `/events/children/${weeklyEvent._id}`;
              console.log(
                `[Login] Requesting child events for ${weeklyEvent.title}: ${childUrl}`
              );

              const childResponse = await axiosInstance.get(childUrl);

              // Log full child response
              console.log(
                `[Login] Child events response for ${weeklyEvent._id}:`,
                {
                  status: childResponse.status,
                  dataType: typeof childResponse.data,
                  isArray: Array.isArray(childResponse.data),
                  length: Array.isArray(childResponse.data)
                    ? childResponse.data.length
                    : "N/A",
                }
              );

              if (childResponse.data && Array.isArray(childResponse.data)) {
                console.log(
                  `[Login] Found ${childResponse.data.length} child events for ${weeklyEvent.title}`
                );

                // Add children to our events array
                allEvents.push(...childResponse.data);
              }
            } catch (childError) {
              console.error(
                `[Login] Error fetching child events for event ${weeklyEvent._id}:`,
                childError.message,
                childError.response?.status,
                childError.response?.data
              );
            }
          }
        }

        // Check if allEvents is empty after processing
        if (allEvents.length === 0) {
          console.log(
            `[Login] WARNING: No events found after processing parent and child events for brand ${brandId}`
          );
          // Return early to prevent errors
          return [];
        }

        // Log allEvents before processing code settings
        console.log(
          `[Login] All events (parents + children) for brand ${brandId}:`,
          {
            count: allEvents.length,
            firstEvent:
              allEvents.length > 0
                ? {
                    id: allEvents[0]._id,
                    title: allEvents[0].title,
                    isChildEvent: !!allEvents[0].parentEventId,
                  }
                : "No events",
          }
        );

        // Step 3: For all events (parent and children), fetch code settings
        console.log(
          `[Login] Fetching code settings for all ${allEvents.length} events`
        );

        // Create a deep copy of allEvents to prevent reference issues
        const eventsCopy = JSON.parse(JSON.stringify(allEvents));

        const eventsWithCodeSettings = await Promise.all(
          eventsCopy.map(async (event) => {
            // For child events, we need to use the parent event ID for code settings
            const parentEventId = event.parentEventId || null;

            // Fetch code settings for this event
            const codeSettings = await fetchCodeSettingsForEvent(
              event._id,
              parentEventId
            );

            // Log the results of code settings fetch
            console.log(`[Login] Code settings for event ${event.title}:`, {
              eventId: event._id,
              settingsCount: codeSettings.length,
              hasSettings: codeSettings.length > 0,
            });

            // Return the event with code settings added
            return {
              ...event,
              codeSettings,
            };
          })
        );

        console.log(`[Login] Completed fetching code settings for all events`);

        // Check if events lost during processing
        if (eventsWithCodeSettings.length !== allEvents.length) {
          console.warn(
            `[Login] WARNING: Event count mismatch - started with ${allEvents.length} events but ended with ${eventsWithCodeSettings.length}`
          );
        }

        // Log the first event with code settings to verify data
        if (eventsWithCodeSettings.length > 0) {
          console.log(`[Login] Sample event with settings:`, {
            id: eventsWithCodeSettings[0]._id,
            title: eventsWithCodeSettings[0].title,
            codeSettingsCount:
              eventsWithCodeSettings[0].codeSettings?.length || 0,
            codeSettings:
              eventsWithCodeSettings[0].codeSettings?.map((cs) => ({
                id: cs._id || cs.id,
                type: cs.type,
                name: cs.name,
              })) || [],
          });
        }

        // FIX: Make sure we're actually returning events to Redux
        // Now dispatch all events with code settings to Redux
        if (eventsWithCodeSettings.length > 0) {
          dispatch(
            addEventsToBrand({
              brandId,
              events: eventsWithCodeSettings,
            })
          );

          console.log(
            `[Login] Fetched and stored ${eventsWithCodeSettings.length} events with code settings for brand ${brandId}`
          );

          return eventsWithCodeSettings;
        } else {
          console.warn(
            `[Login] No events with code settings to dispatch for brand ${brandId}`
          );
          return [];
        }
      } else {
        console.warn(
          `[Login] Unexpected response format for brand ${brandId}:`,
          typeof response.data,
          response.data
        );
        return [];
      }
    } catch (error) {
      console.error(
        `[Login] Error fetching events for brand ${brandId}:`,
        error.message,
        error.response?.status,
        error.response?.data
      );

      // Add a fallback attempt with a different URL format
      try {
        console.log(`[Login] Attempting fallback API call for events...`);
        // Try alternative endpoint
        const fallbackUrl = `/api/events/brand/${brandId}`;
        console.log(`[Login] Requesting fallback URL: ${fallbackUrl}`);

        const fallbackResponse = await axiosInstance.get(fallbackUrl);

        console.log(`[Login] Fallback response successful:`, {
          status: fallbackResponse.status,
          dataLength: Array.isArray(fallbackResponse.data)
            ? fallbackResponse.data.length
            : "Not an array",
        });

        if (
          fallbackResponse.data &&
          Array.isArray(fallbackResponse.data) &&
          fallbackResponse.data.length > 0
        ) {
          // Process fallback data
          dispatch(
            addEventsToBrand({
              brandId,
              events: fallbackResponse.data,
            })
          );

          console.log(
            `[Login] Successfully fetched ${fallbackResponse.data.length} events via fallback endpoint`
          );
          return fallbackResponse.data;
        }
      } catch (fallbackError) {
        console.error(
          `[Login] Fallback attempt also failed:`,
          fallbackError.message
        );
      }
    }
    return [];
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    // Set Redux loading state
    dispatch(setLoading());

    try {
      console.log("[Login] Starting login process...");

      // Perform the login
      const userData = await login(formData);

      // Ensure we're getting the full user object with all properties
      const fullUserData = userData?.user || userData;

      console.log("[Login] Login successful, user data received:", {
        username: fullUserData.username,
        email: fullUserData.email,
        brandsCount: fullUserData.brands?.length || 0,
      });

      // Set complete user data in Redux
      dispatch(setUser(fullUserData));

      // Before proceeding, check if there might be brands loaded through other means
      // Sometimes the brands aren't directly in the user data from login
      // but are loaded through BrandContext or another mechanism
      const initialReduxState = store.getState();
      const initialBrandsInRedux = initialReduxState?.brand?.allBrands || [];

      console.log("[Login] Checking initial Redux state after user data set:", {
        brandsInReduxCount: initialBrandsInRedux.length,
        brandsInUserData: fullUserData.brands?.length || 0,
      });

      // Determine which brands list to use - prefer Redux if available
      const brandsToProcess =
        initialBrandsInRedux.length > 0
          ? initialBrandsInRedux
          : fullUserData.brands || [];

      console.log(
        `[Login] Processing ${brandsToProcess.length} brands for events and roles`
      );

      // Now fetch roles and events if there are any brands to process
      if (brandsToProcess.length > 0) {
        console.log(
          `[Login] Found ${brandsToProcess.length} brands, fetching roles and events for each...`
        );

        // Fetch roles and events for each brand
        const brandsWithEvents = [];

        for (const brand of brandsToProcess) {
          if (brand._id) {
            console.log(
              `[Login] Processing brand: ${brand.name} (${brand._id})`
            );

            // Fetch roles for this brand
            const roles = await fetchRolesForBrand(brand._id);
            console.log(
              `[Login] Fetched and stored ${
                roles?.length || 0
              } roles for brand ${brand.name}`
            );

            // Then fetch events for this brand
            const events = await fetchEventsForBrand(brand._id);

            if (events && events.length > 0) {
              console.log(
                `[Login] Successfully fetched ${events.length} events for brand ${brand.name}`
              );
              brandsWithEvents.push({
                brandId: brand._id,
                brandName: brand.name,
                eventsCount: events.length,
              });
            } else {
              console.warn(
                `[Login] No events fetched for brand ${brand.name} (${brand._id})`
              );

              // Try fetching directly by username as a fallback
              try {
                console.log(
                  `[Login] Trying to fetch events by brand username: ${brand.username}`
                );
                const usernameUrl = `/events/date/${brand.username}`;
                const usernameResponse = await axiosInstance.get(usernameUrl);

                console.log(`[Login] Brand username events response:`, {
                  status: usernameResponse.status,
                  dataCount: Array.isArray(usernameResponse.data)
                    ? usernameResponse.data.length
                    : "Not an array",
                });

                if (
                  usernameResponse.data &&
                  Array.isArray(usernameResponse.data) &&
                  usernameResponse.data.length > 0
                ) {
                  // We got some events through the username API
                  const eventsWithCodeSettings = await Promise.all(
                    usernameResponse.data.map(async (event) => {
                      // For child events, use parent event ID for code settings
                      const parentEventId = event.parentEventId || null;
                      const codeSettings = await fetchCodeSettingsForEvent(
                        event._id,
                        parentEventId
                      );
                      return {
                        ...event,
                        codeSettings,
                      };
                    })
                  );

                  dispatch(
                    addEventsToBrand({
                      brandId: brand._id,
                      events: eventsWithCodeSettings,
                    })
                  );

                  console.log(
                    `[Login] Successfully fetched ${eventsWithCodeSettings.length} events via username for brand ${brand.name}`
                  );
                  brandsWithEvents.push({
                    brandId: brand._id,
                    brandName: brand.name,
                    eventsCount: eventsWithCodeSettings.length,
                    method: "username",
                  });
                }
              } catch (usernameError) {
                console.error(
                  `[Login] Username events fetch failed:`,
                  usernameError.message
                );
              }
            }
          } else {
            console.warn(`[Login] Brand is missing _id:`, brand);
          }
        }

        // Log summary of fetched data
        console.log(`[Login] Data fetching summary:`, {
          brandsTotal: brandsToProcess.length,
          brandsWithEvents: brandsWithEvents.length,
          eventCounts: brandsWithEvents,
        });

        // If we didn't get any events for any brands, try direct API call to /events
        if (brandsWithEvents.length === 0) {
          console.log(
            `[Login] No events found for any brands, trying direct API calls...`
          );

          // Try the global events endpoint
          try {
            const directEventsResponse = await axiosInstance.get("/events");
            console.log(`[Login] Direct events API response:`, {
              status: directEventsResponse.status,
              dataType: typeof directEventsResponse.data,
              count: Array.isArray(directEventsResponse.data)
                ? directEventsResponse.data.length
                : "Not an array",
            });

            if (
              directEventsResponse.data &&
              Array.isArray(directEventsResponse.data) &&
              directEventsResponse.data.length > 0
            ) {
              // Process these events if we have them
              console.log(
                `[Login] Processing ${directEventsResponse.data.length} events from direct API call`
              );

              // Group events by brand
              const eventsByBrand = {};
              directEventsResponse.data.forEach((event) => {
                if (event.brand) {
                  const brandId =
                    typeof event.brand === "object"
                      ? event.brand._id
                      : event.brand;
                  if (!eventsByBrand[brandId]) {
                    eventsByBrand[brandId] = [];
                  }
                  eventsByBrand[brandId].push(event);
                }
              });

              // Process each brand's events
              for (const [brandId, events] of Object.entries(eventsByBrand)) {
                const eventsWithSettings = await Promise.all(
                  events.map(async (event) => {
                    const parentEventId = event.parentEventId || null;
                    const codeSettings = await fetchCodeSettingsForEvent(
                      event._id,
                      parentEventId
                    );
                    return {
                      ...event,
                      codeSettings,
                    };
                  })
                );

                dispatch(
                  addEventsToBrand({
                    brandId,
                    events: eventsWithSettings,
                  })
                );

                console.log(
                  `[Login] Added ${eventsWithSettings.length} events to brand ${brandId} from direct API`
                );
              }
            }
          } catch (directError) {
            console.error(
              `[Login] Direct events API call failed:`,
              directError.message
            );
          }
        }
      } else {
        console.log(
          "[Login] No brands found in user data or Redux. Skipping event fetch."
        );

        // Try direct API call to fetch brands as a last resort
        try {
          console.log("[Login] Attempting to fetch brands directly...");

          // Try fetching brands directly with axiosInstance
          const brandsResponse = await axiosInstance.get("/brands");
          console.log("[Login] Direct brands API response:", {
            status: brandsResponse.status,
            dataType: typeof brandsResponse.data,
            count: Array.isArray(brandsResponse.data)
              ? brandsResponse.data.length
              : "Not an array",
          });

          if (
            brandsResponse.data &&
            Array.isArray(brandsResponse.data) &&
            brandsResponse.data.length > 0
          ) {
            console.log(
              `[Login] Found ${brandsResponse.data.length} brands from direct API`
            );

            // Process these brands like we did above
            for (const brand of brandsResponse.data) {
              if (brand._id) {
                console.log(
                  `[Login] Processing brand from direct API: ${brand.name}`
                );

                // Fetch events for this brand
                const events = await fetchEventsForBrand(brand._id);
                if (events && events.length > 0) {
                  console.log(
                    `[Login] Successfully fetched ${events.length} events for brand ${brand.name}`
                  );
                }
              }
            }

            // Check if that worked
            const afterBrandFetchState = store.getState();
            const brandsAfterFetch =
              afterBrandFetchState?.brand?.allBrands || [];

            console.log("[Login] After direct brands fetch:", {
              brandsFound: brandsAfterFetch.length,
            });
          }
        } catch (directBrandsError) {
          console.error(
            "[Login] Error fetching brands directly:",
            directBrandsError.message
          );
        }
      }

      // Show success toast
      toast.showSuccess("Welcome back!");

      // Check Redux store to make sure events were loaded
      const reduxState = store.getState();
      const brandsInRedux = reduxState?.brand?.allBrands || [];

      console.log(`[Login] Final Redux store state:`, {
        brandsCount: brandsInRedux.length,
        brandsWithEvents: brandsInRedux.filter(
          (b) =>
            b.events &&
            ((Array.isArray(b.events) && b.events.length > 0) ||
              (b.events.items && b.events.items.length > 0))
        ).length,
        firstBrandEvents:
          brandsInRedux.length > 0
            ? Array.isArray(brandsInRedux[0].events)
              ? brandsInRedux[0].events.length
              : brandsInRedux[0].events?.items?.length || 0
            : "No brands",
      });

      // Navigate to dashboard after all data is loaded
      console.log(
        `[Login] Navigation to dashboard: /@${fullUserData.username}`
      );
      navigate(`/@${fullUserData.username}`);
    } catch (error) {
      // Enhanced error logging
      console.error("[Login] Login process failed:", {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        stack: error.stack,
      });

      // Set error in Redux
      dispatch(setError(error.message || "Login failed"));

      const errorMessage =
        error.response?.data?.message || "Login failed. Please try again.";
      toast.showError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const loginContent = (
    <div className="login">
      <Navigation />

      <motion.div
        className="login-container"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        key="login-form"
      >
        <motion.h1
          className="login-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          Welcome Back
        </motion.h1>

        <motion.form
          className="login-form"
          onSubmit={handleSubmit}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <div className="input-group">
            <input
              type="text"
              name="email"
              placeholder="Email or Username"
              value={formData.email}
              onChange={handleChange}
              required
              className="login-input"
              autoComplete="username"
            />
          </div>

          <div className="input-group">
            <input
              type="password"
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              required
              className="login-input"
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className="login-button" disabled={isLoading}>
            {isLoading ? (
              <>
                <span className="loading-spinner"></span>
                Logging in...
              </>
            ) : (
              "Log In"
            )}
          </button>
        </motion.form>
      </motion.div>
    </div>
  );

  // Wrap the entire login content with the Maintenance component
  return <Maintenance>{loginContent}</Maintenance>;
}

export default Login;
