# GuestCodes Application Protocol

## Current State (as of June 2024)

### Overview

The GuestCodes application is a platform for managing events and their associated access codes. It allows event organizers to create events, configure different types of access codes, and manage guest lists.

### Core Models

1. **Event Model**

   - Stores event information (name, date, location, etc.)
   - Contains legacy boolean fields for code types (guestCode, friendsCode, ticketCode, tableCode, backstageCode)
   - Supports weekly recurring events with parent-child relationship

2. **CodeSettings Model**

   - New model for flexible code configuration
   - Stores settings for different code types (guest, friends, ticket, table, backstage, custom)
   - Properties include: name, type, condition, maxPax, limit, isEnabled, isEditable
   - Linked to events via eventId

3. **Code Model**
   - Represents individual codes generated for events
   - Contains code value, type, usage information
   - Now includes codeSettingId to link to the CodeSettings model

### Controllers

1. **eventsController.js**

   - Handles CRUD operations for events
   - Supports weekly recurring events
   - Initializes default code settings when creating events
   - Updates code settings when updating events
   - Handles child events for weekly occurrences

2. **codeSettingsController.js**

   - Manages code settings for events
   - Provides endpoints for getting, configuring, and deleting code settings
   - Includes optional authentication for viewing settings
   - Maintains backward compatibility with legacy code fields

3. **codesController.js**
   - Handles code generation, verification, and management
   - Integrates with CodeSettings model for validation
   - Supports QR code generation

### Routes

1. **codeSettingsRoutes.js**

   - GET /code-settings/events/:eventId - Get all code settings for an event (optional auth)
   - PUT /code-settings/events/:eventId - Configure code settings (requires auth)
   - DELETE /code-settings/events/:eventId/:codeSettingId - Delete a code setting (requires auth)

2. **codesRoutes.js**

   - Various endpoints for code management
   - Supports creating, retrieving, updating, and deleting codes
   - Includes endpoints for QR code generation and verification

3. **eventsRoutes.js**
   - CRUD operations for events
   - Supports weekly event management

### Recent Improvements

1. **Flexible Code Settings**

   - Moved from fixed boolean fields to a dynamic CodeSettings model
   - Allows for custom code types beyond the predefined ones
   - Supports more detailed configuration (maxPax, limit, condition)

2. **Authentication Handling**

   - Added optional authentication for viewing code settings
   - Improved error handling for authentication failures
   - Frontend gracefully handles unauthorized access

3. **Weekly Events Support**

   - Enhanced support for weekly recurring events
   - Code settings can be inherited or customized for child events

4. **Frontend Integration**
   - EventSettings component updated to work with the new CodeSettings model
   - Improved error handling and user feedback
   - Support for view-only mode when user lacks edit permissions

### Known Issues

1. Fixed an issue where the server would crash when trying to access `req.user._id` when `req.user` was undefined
2. Improved error handling in the frontend to gracefully handle 500 errors from the server
3. Fixed React key warnings in list rendering

### Next Steps

1. Continue testing the integration between the new CodeSettings model and existing code
2. Consider further optimizations for weekly events
3. Enhance the user interface for code management
4. Improve documentation for API endpoints
