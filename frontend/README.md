# Frontend Setup Guide

This is the frontend application for the web-n8n-auth project, built with React and Firebase Authentication.

## Prerequisites

- Node.js 14.x or higher
- npm or yarn package manager
- Backend server running (see backend README)

## Environment Setup

1. Install dependencies:
```bash
npm install
# or if using yarn
yarn install
```

2. Configure environment variables:
   - Copy `.env.example` to `.env` (if not exists)
   - Update the following Firebase configuration in `.env`:
     ```
     REACT_APP_BACKEND_URL=http://localhost:8001
     REACT_APP_FIREBASE_API_KEY=your-api-key
     REACT_APP_FIREBASE_AUTH_DOMAIN=your-auth-domain
     REACT_APP_FIREBASE_PROJECT_ID=your-project-id
     REACT_APP_FIREBASE_STORAGE_BUCKET=your-storage-bucket
     REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
     REACT_APP_FIREBASE_APP_ID=your-app-id
     ```

## Running the Application

1. Make sure the backend server is running
2. Start the development server:
```bash
npm start
# or if using yarn
yarn start
```

The application will be available at `http://localhost:3000`

## Project Structure

```
frontend/
├── .env                # Environment variables
├── public/            # Static files
├── src/
│   ├── App.js         # Main application component
│   ├── firebase.js    # Firebase configuration
│   ├── index.js       # Application entry point
│   └── ...           # Other components and styles
├── package.json       # Dependencies and scripts
└── tailwind.config.js # Tailwind CSS configuration
```

## Building for Production

To create a production build:
```bash
npm run build
# or if using yarn
yarn build
```

The build files will be created in the `build/` directory.

## Common Issues

1. If you see CORS errors, make sure the backend server is running
2. Check if all Firebase environment variables are properly set
3. If you get dependency conflicts, try using `npm install --force`
4. Make sure you're using the correct Node.js version

cd frontend
npm install
npm start