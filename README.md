**UI-ScholarHub**

UI-ScholarHub is a CSC 476 academic project developed as a prototype repository for storing, searching and accessing academic and research outputs from the University of Ibadan. The system is designed to provide students, researchers and other users with an organised platform for discovering and accessing research materials.

**Technologies Used**

The project was developed using the following technologies:

- HTML5 for the structure of the application.
- CSS3 for styling and responsive page layouts.
- JavaScript for application functionality and data management.
- LocalStorage for storing user accounts and research records.
- IndexedDB for storing uploaded files.
- Progressive Web App (PWA) technologies to support a mobile-friendly experience.

The application uses vanilla JavaScript and does not require any frontend framework or server to run locally.

## Core Features

UI-ScholarHub includes the following features:

1. Public Search: Allows users to search for research outputs using titles, authors, keywords and abstracts.
2. Search Filters: Users can narrow their searches by faculty, department, author, output type and year of publication.
3. Research Details: Provides individual pages containing information about each research output.
4. Download Management: Supports open and restricted access to research materials.
5. User Registration: Allows users to create accounts using valid University of Ibadan email addresses ending in @ui.edu.ng or @dlc.ui.edu.ng.
6. Research Submission: Provides a submission form through which registered users can deposit their research outputs.
7. Librarian Approval: Allows librarians to review submitted materials and either approve or reject them.
8. My Submissions: Allows depositors to view and monitor their submitted research outputs.
9. Librarian Dashboard: Provides statistics and information about the repository's activities.
10. JSON Helper Functions: Includes ScholarHubAPI functions that can be used by web and mobile clients to access repository data.
11. OAI-PMH-Style Metadata Support: Includes a prototype metadata helper for operations such as Identify and ListRecords.
12. Password Security: Uses PBKDF2 with HMAC-SHA256 for password hashing.

## How to Run the Project Locally

The application does not require any additional installation.

There are two ways to run it:

**Option 1: Open Directly**

Locate the project folder and double-click the index.html file. It will open in your default web browser.

**Option 2: Use Visual Studio Code**

1. Open the project folder in Visual Studio Code.
2. Install the Live Server extension if it is not already installed.
3. Right-click the index.html file.
4. Select "Open with Live Server".

Using Live Server is recommended for a smoother development and testing experience.

## Demo Librarian Account

The following account is provided for testing the librarian dashboard and its administrative features.

- Email: admin@ui.edu.ng
- Password: Admin@12345

The demo password should be changed before any real deployment of the system.

## Project Structure

The project files are organised as follows:

```text
UI-ScholarHub/
│
├── index.html          Search page
├── login.html          Login page
├── register.html       Registration page
├── detail.html         Research output details
├── deposit.html        Research submission form
├── my-outputs.html     My submissions page
├── admin.html          Librarian dashboard
├── error.html          Error pages (403 and 404)
├── manifest.json       PWA configuration
│
└── static/
    ├── style.css       Application styles
    ├── sw.js           Service worker
    └── app.js          Shared application logic
```

The app.js file contains the shared JavaScript functionality, including data storage, authentication, search operations, password hashing and JSON helper functions.

## JSON Helper Functions

The project includes a JavaScript object called ScholarHubAPI. It provides helper functions for accessing repository information without relying on external API endpoints.

To test the functions, open the browser's developer console while running any project page.

The following examples demonstrate how to use the available functions:

```javascript
ScholarHubAPI.outputs({ q: 'machine' });

ScholarHubAPI.outputs({
  faculty: 'Science',
  year: '2025'
});

ScholarHubAPI.facets();

ScholarHubAPI.output(1);

await ScholarHubAPI.register({
  name,
  email,
  password
});

ScholarHubAPI.oai('Identify');

ScholarHubAPI.oai('ListRecords');
```

These functions support searching for research outputs, retrieving individual records, accessing available search filters, registering users and retrieving metadata.

## Data Storage and Limitations

All application data, including user accounts, research records and uploaded files, is stored locally in the browser being used.

This means that each browser or device maintains its own separate copy of the data. Information stored in one browser is not automatically available to users on another device.

Clearing the browser's site data will also erase the stored application information.

Sample research records and the demo librarian account are automatically created when the application is first loaded.

Since the current version does not use a central database or server-side backend, it is not yet suitable for managing a shared repository where multiple users access the same records.

For a fully functional multi-user system, the application would need to be connected to a backend, such as Node.js, together with a database.

## Project Scope and Future Improvements

UI-ScholarHub is an academic prototype developed to demonstrate the major features and workflow of a university research repository.

Although the prototype provides basic repository functionality, additional development would be required before it could be used in a real university environment.

Some areas that would require further improvement include:

- Developing a proper server-side backend and central database.
- Implementing HTTPS and secure management of sensitive information.
- Adding rate limiting and Cross-Site Request Forgery (CSRF) protection.
- Improving file upload security through proper file scanning.
- Strengthening database security and access control.
- Introducing email notifications for registration and submission activities.
- Implementing the complete OAI-PMH standard for metadata harvesting.
- Conducting tests on different devices and browsers.
- Carrying out user acceptance testing to evaluate the system's usability and performance.

These improvements would help make UI-ScholarHub more secure, reliable and suitable for wider deployment.
