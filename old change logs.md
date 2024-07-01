Change Log: v2
Added System Monitoring Features: The code now includes functions to retrieve and display total disk space available and network statistics. This data is exposed through the new endpoint "/d/data", providing detailed server information like version, uptime, memory usage, CPU usage, disk space, and network stats.

Enhanced User Tracking: User connections are now tracked using a Set to manage online users and display the total unique online users each time a connection is made.

Improved Error Handling: Error handling has been enhanced with specific error responses for 404 and 500 status codes. Additionally, error logging and response messages are implemented to provide better feedback to clients.

Security Enhancements: Password protection has received an update to allow for multiple authentication mechanisms based on configuration. The code now supports both custom username-password authentication and basic authentication using stored user credentials.

Code Refactoring and Clean-up: The codebase has undergone refactoring for better readability and maintainability. New modules like 'os' and 'util' are imported for system-related functionalities, and deprecated modules are removed. The updated code showcases a more organized and efficient structure.