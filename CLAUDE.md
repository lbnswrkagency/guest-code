# Claude Development Notes

## Testing
- Always test functionality yourself before considering tasks complete
- Build process should be tested locally

## URL-based Event Navigation
- UpcomingEvent component now supports URL-based navigation hints
- When URL contains a date slug (e.g., /270625), the component automatically navigates to matching event
- Date format: MMDDYY (e.g., 270625 for June 27, 2025)
- This is "fake routing" - just a hint for UpcomingEvent's internal navigation system

## File Deletion Anomalies
- Flyer deletion appears inconsistent
- S3 logs show successful file deletion, but files may still persist in database
- Deletion process in @client/src/Components/EventForm/ does not fully remove files
- Relevant files to investigate:
  - @server/controllers/eventsController.js
  - @server/routes/api/eventsRoutes.js
- Observed behavior: 
  - Deletion logs show successful removal
  - Files remain accessible after closing/reopening component
  - Potential sync issues between S3 and database deletion processes