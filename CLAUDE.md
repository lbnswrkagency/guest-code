# Claude Development Notes

## Testing
- Always test functionality yourself before considering tasks complete
- Build process should be tested locally

## URL-based Event Navigation
- UpcomingEvent component now supports URL-based navigation hints
- When URL contains a date slug (e.g., /270625), the component automatically navigates to matching event
- Date format: MMDDYY (e.g., 270625 for June 27, 2025)
- This is "fake routing" - just a hint for UpcomingEvent's internal navigation system