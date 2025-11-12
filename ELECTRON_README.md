# Show Booking - Electron Desktop Application# Show Booking Desktop Application



This is a desktop version of the Show Booking System built with Electron. The app uses the remote backend hosted on Render, so no local server setup is required.A desktop application for the Show Booking System built with Electron.



## Prerequisites## Prerequisites



- Node.js (v18 or higher)- Node.js (v16 or higher)

- npm or yarn- MongoDB (running locally on port 27017)

- Internet connection (to connect to the remote backend)- Environment variables configured in `server/.env`



## Remote Backend## Required Environment Variables



The application connects to the backend hosted at:Create a `server/.env` file with:

- **API URL:** `https://showbooking-iqzi.onrender.com/api`

- **Frontend URL:** `https://show-booking-coral.vercel.app````env

PORT=4000

No local MongoDB or server setup is needed!MONGODB_URI=mongodb://localhost:27017/show-booking

CLOUDINARY_CLOUD_NAME=your_cloud_name

## InstallationCLOUDINARY_API_KEY=your_api_key

CLOUDINARY_API_SECRET=your_api_secret

1. Install dependencies:CLIENT_ORIGIN=http://localhost:4000,file://

```bashNODE_ENV=production

npm install```

```

## Installation

## Development

1. Install dependencies:

To run the app in development mode:```bash

npm install

```bash```

npm start

# or2. Install server dependencies:

npm run dev```bash

```cd server

npm install

This will open the Electron app with DevTools enabled and connect to the remote Render backend.cd ..

```

## Building

## Development

### Build for Windows (NSIS Installer)

Run the app in development mode:

```bash```bash

npm run buildnpm run dev

``````



This will create:This will:

- `dist/Show Booking Setup 1.0.0.exe` - Windows installer- Start the backend server on port 4000

- The installer includes all necessary files and creates desktop/start menu shortcuts- Open the Electron window with DevTools

- Enable hot reload for frontend changes

### Build to Directory (Unpacked)

## Building the Executable

For testing the build without creating an installer:

Build the Windows .exe installer:

```bash```bash

npm run build:dirnpm run build

``````



This creates an unpacked folder in `dist/win-unpacked/` that you can run directly.The installer will be created in the `dist` folder.



## DistributionFor a portable build without installer:

```bash

The built `.exe` file can be distributed to users. When they run the installer:npm run build:dir

1. They choose installation directory```

2. Desktop and Start Menu shortcuts are created

3. The app connects to the remote backend automatically## How It Works

4. No additional setup or configuration required!

1. **Electron Main Process** (`electron/main.js`):

## Features   - Starts the Node.js backend server

   - Creates the application window

- ✅ Standalone desktop application   - Manages application lifecycle

- ✅ No local server setup needed

- ✅ Connects to remote backend on Render2. **Backend Server** (`server/`):

- ✅ Windows installer with NSIS   - Runs on localhost:4000

- ✅ Desktop and Start Menu shortcuts   - Handles all API requests

- ✅ Automatic updates support (can be configured)   - Manages database connections

- ✅ Professional window management

- ✅ DevTools available in development mode3. **Frontend** (`index.html`, `js/`, `css/`):

   - Automatically detects Electron environment

## File Structure   - Uses local backend in desktop app

   - Falls back to remote backend in web browser

```

Show Booking/## Troubleshooting

├── electron/

│   ├── main.js          # Main Electron process### MongoDB Connection Error

│   └── preload.js       # Preload script for securityEnsure MongoDB is running:

├── index.html           # Frontend entry point```bash

├── css/                 # Stylesheetsmongod

├── js/                  # Frontend JavaScript```

├── img/                 # Images and icons

├── video/               # Video assets### Port Already in Use

├── package.json         # Electron configurationChange the PORT in `electron/main.js` and `server/.env`

└── ELECTRON_README.md   # This file

```### Build Fails

Ensure all dependencies are installed:

## Configuration```bash

npm install

The app automatically uses the remote backend. If you want to change the backend URL:cd server && npm install

```

1. Open browser DevTools (F12)

2. Go to Console## Distribution

3. Run: `localStorage.setItem("msb_api_base", "YOUR_BACKEND_URL")`

4. Restart the appThe built `.exe` file in `dist/` can be distributed to users. They need:

- Windows 10 or higher (64-bit)

## Troubleshooting- MongoDB installed and running locally

- Or a remote MongoDB connection string configured

### App won't start

- Check your internet connection## Notes

- Verify the backend at https://showbooking-iqzi.onrender.com/health is accessible

- The app bundles both frontend and backend

### Can't build the installer- Data is stored in local MongoDB

- Make sure you have installed all dependencies: `npm install`- Cloudinary credentials needed for image uploads

- Check that you have write permissions to the `dist/` folder- The app can work offline (except for Cloudinary uploads)

- Try building to directory first: `npm run build:dir`

### Backend connection errors
- Ensure you have an active internet connection
- Check if Render backend is running (visit the health endpoint)
- Clear localStorage and restart the app

## Technical Details

- **Electron Version:** 28.x
- **Node Integration:** Disabled (for security)
- **Context Isolation:** Enabled
- **Backend:** Remote (Render)
- **Target Platform:** Windows x64
- **Installer Type:** NSIS

## Support

For issues related to:
- Desktop app: Check this README
- Backend API: Contact backend administrator
- Frontend features: Check main README.md

---

**Note:** This desktop app is simply a wrapper around the web application. All data is stored on the remote backend, so multiple users can use different desktop installations and see the same data.
