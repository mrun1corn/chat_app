# Chat App

A real-time chat application built with Next.js, React, and Firebase.

## Table of Contents

- [Features](#features)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Firebase Setup](#firebase-setup)
  - [Running the Application](#running-the-application)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)

## Features

- Google Authentication
- Real-time Chat
- User Profiles (username, profile picture, active status)
- Connection Requests (send, accept, reject)
- User Search
- Responsive Design
- Dark/Light Mode Toggle

## Getting Started

Follow these instructions to get a copy of the project up and running on your local machine.

### Prerequisites

- Node.js (LTS version recommended)
- npm or yarn
- A Firebase project

### Installation

1.  **Clone the repository:**

    ```bash
    git clone <repository-url>
    cd ai_app
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    # or
    yarn install
    ```

### Firebase Setup

1.  **Create a Firebase Project:**
    - Go to the [Firebase Console](https://console.firebase.google.com/).
    - Click "Add project" and follow the setup steps.

2.  **Enable Authentication:**
    - In your Firebase project, navigate to "Authentication" > "Sign-in method".
    - Enable "Google" as a sign-in provider.

3.  **Set up Firestore Database:**
    - In your Firebase project, navigate to "Firestore Database".
    - Click "Create database" and choose a starting mode (start in test mode for quick setup, but remember to secure your rules).
    - **Firestore Security Rules:** Go to the "Rules" tab and replace the default rules with the following. These rules are a starting point and should be reviewed and tightened for production:

        ```firestore
        rules_version = '2';
        service cloud.firestore {
          match /databases/{database}/documents {
            // Allow authenticated users to read and write their own user profiles
            match /users/{userId} {
              allow read: if request.auth.uid != null; // Allows any authenticated user to read all user profiles for username check
              allow update, delete: if request.auth.uid == userId;
              allow create: if request.auth.uid != null;
            }

            // Allow authenticated users to create connection requests
            // Allow users involved in the request to read it
            // Allow users to update/delete their own requests (e.g., accept/reject)
            match /connectionRequests/{requestId} {
              allow create: if request.auth.uid != null;
              allow read: if request.auth.uid == resource.data.fromUid || request.auth.uid == resource.data.toUid;
              allow update, delete: if request.auth.uid == resource.data.fromUid || request.auth.uid == resource.data.toUid;
            }

            // Allow users involved in a connection to read it
            // Allow users to delete their own connections
            match /connections/{connectionId} {
              allow create: if request.auth.uid != null;
              allow read: if request.auth.uid == resource.data.user1Uid || request.auth.uid == resource.data.user2Uid;
              allow delete: if request.auth.uid == resource.data.user1Uid || request.auth.uid == resource.data.user2Uid;
            }

            // Allow authenticated users to read/write messages (VERY BROAD - tighten for production)
            match /messages/{messageId} {
              allow create: if request.auth.uid != null;
              allow read, write: if request.auth.uid != null;
            }
          }
        }
        ```

4.  **Set up Firebase Storage:**
    - In your Firebase project, navigate to "Storage".
    - Click "Get started" and follow the steps to set up your storage bucket.
    - **Storage Security Rules:** Go to the "Rules" tab and ensure your rules allow authenticated users to upload profile pictures. A basic rule might look like this:

        ```firestore
        rules_version = '2';
        service firebase.storage {
          match /b/{bucket}/o {
            match /profile-pics/{userId} {
              allow read: if true; // Anyone can read profile pics
              allow write: if request.auth != null && request.auth.uid == userId; // Only owner can write
            }
          }
        }
        ```

5.  **Get Firebase Configuration:**
    - In your Firebase project, go to "Project settings" (the gear icon next to "Project overview").
    - Under "Your apps", select "Web" (the `</>` icon).
    - Copy the `firebaseConfig` object.

6.  **Configure Environment Variables:**
    - Create a file named `.env.local` in the root of your project (`ai_app/`).
    - Add your Firebase configuration details to this file, using `NEXT_PUBLIC_` prefix for client-side accessible variables:

        ```env
        NEXT_PUBLIC_FIREBASE_API_KEY="YOUR_API_KEY"
        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="YOUR_AUTH_DOMAIN"
        NEXT_PUBLIC_FIREBASE_PROJECT_ID="YOUR_PROJECT_ID"
        NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="YOUR_STORAGE_BUCKET"
        NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="YOUR_MESSAGING_SENDER_ID"
        NEXT_PUBLIC_FIREBASE_APP_ID="YOUR_APP_ID"
        NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID="YOUR_MEASUREMENT_ID"
        ```
    - Replace the placeholder values with your actual Firebase configuration.
    - **Important:** The `apiKey` is the only one directly used from `process.env` in `src/app/firebase.ts`. The others are included for completeness in the `.env.local` example, but `firebase.ts` currently hardcodes them. For a more secure setup, you should update `firebase.ts` to use environment variables for all these values.

### Running the Application

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
ai_app/
├───.next/             # Next.js build output
├───node_modules/      # Project dependencies
├───public/            # Static assets (images, etc.)
├───src/
│   ├───app/
│   │   ├───components/  # React components
│   │   ├───profile/     # Profile page route
│   │   ├───utils/       # Utility functions
│   │   ├───connections.ts # Firebase connection logic
│   │   ├───firebase.ts    # Firebase initialization (uses env vars for API key)
│   │   └───firebase-config.example.ts # Example Firebase config
│   │   ├───globals.css  # Global styles
│   │   ├───layout.tsx   # Root layout
│   │   └───page.tsx     # Main application page
├───.gitignore         # Git ignore file
├───next-env.d.ts      # Next.js environment type definitions
├───next.config.mjs    # Next.js configuration
├───package-lock.json  # npm lock file
├───package.json       # Project metadata and dependencies
├───postcss.config.mjs # PostCSS configuration
├───tailwind.config.ts # Tailwind CSS configuration
└───tsconfig.json      # TypeScript configuration
```

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

This project is open source and available under the [MIT License](LICENSE).