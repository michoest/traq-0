# Goal
Build a web app named "Traq" to keep track of time spent on various tasks and projects.

# Specification
## General
- There are multiple activities/projects/tasks (what is the best name?) for which I want to track the time spent on doing them
- Tasks can have tags to add non-hierarchical categories for aggregation
- I can very easily start and stop a task (and they are non-exclusive)
- I can see stats of individual tasks and categories
- When offline, I can still start and stop tasks, and sync is performed when back online (connection status is shown as a very unobtrusive green or red line, or similar)
- There is a basic e-mail/password login and a splash screen
- Use the logo in /traq.svg for app icon and favicon (convert with magick)

## Frontend
- Setup
  - Folder: /app
  - Vue PWA with Vuetify
  - Deployed locally on a MacBook Pro for testing
  - Deployed for production on Github pages at traq.michoest.com (custom domain) via gh-pages (npm run deploy)
  - Backend URL set in an .env file
- UI
  - There are three main pages, with a tabs component at the bottom: Tracker, stats, and settings
    - Tracker
      - Show all tasks (as cards or tiles?) and click to start/stop -> These actions have to be as frictionless as possible
      - If "allow multiple tasks at a time" is enabled, 
      - Show which tasks are currently active (with time since start); these should be at the top
      - Tasks can be filtered by tags
      - Let the user add/edit/archive tasks (or is this better in settings?)
    - Stats
      - Show distribution of tasks for the last day/week/7 days/month (with tag filter)
      - Show occurrences over these time ranges for individual tasks/tags
      - Download CSV file with all data
    - Settings
      - Show the logged-in user (name and mail) with a logout button
      - Management of tags (add/edit (name, color and mdi icon), delete, re-order)
      - Allow multiple tasks at a time?
      - Advanced settings (collapsible)
        - Build date and time
        - Backend URL
        - Debug logs (for mobile, where there is no dev mode)
    - As in iOS 26, action buttons (and anything that is meant to be pressed, for that matter) are preferably at the bottom (right above the tabs) and styled as FABs or FAB groups
    - Tags are generally shown as colored chips


## Backend
- Folder : /api
- Node/express server with lowdb database
- Deployed locally on a MacBook Pro for testing
- Deployed for production on a Raspberry Pi 5 at traq.api.michoest.com behind nginx
- CORS routes and port set in an .env file
- Endpoints to start/stop a task that can easily be called by iOS shortcuts