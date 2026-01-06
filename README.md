# WSSC Management System - Web Interface

Complete web interface for Super Admin, CEO, and General Manager roles.

## Features

### Role-Based Access Control
- **Super Admin**: Full access to all features
- **CEO**: Full access to all features
- **General Manager**: Access to most features (limited system settings)

### Available Pages

1. **Dashboard** - Overview statistics and charts
2. **Users Management** - Create, edit, delete users (Super Admin, CEO, GM)
3. **Attendance Management** - View and filter attendance records
4. **Leave Management** - View and approve/reject leave requests
5. **Assignments** - Manage staff and supervisor assignments
6. **Locations** - Manage locations with geofencing (Super Admin, CEO, GM)
7. **Zones** - Manage zones within locations (Super Admin, CEO, GM)
8. **Departments** - Manage departments (Super Admin, CEO only)
9. **Performance Reviews** - View performance review records
10. **Approvals** - Approve/reject attendance and leave requests
11. **Holidays** - Manage company holidays (Super Admin, CEO only)
12. **Live Tracking** - View real-time location tracking data
13. **Reports** - Generate attendance and leave reports with charts
14. **System Settings** - Configure system parameters (Super Admin, CEO only)

## Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- MySQL database server

### Backend Configuration

**Note:** The frontend is configured to connect to the production backend at `https://api.webypixels.com/api`. 

If you need to set up a local backend for development, see the `backend/README.md` file. However, for normal usage, you can use the production backend directly.

**Production Backend:** `https://api.webypixels.com/api`

### Frontend Setup

1. Navigate to the web-interface directory:
```bash
cd web-interface
```

2. Install frontend dependencies:
```bash
npm install
```

3. Configure API URL:
   
   The frontend is configured to connect to the production backend at `api.webypixels.com`.
   
   The `.env` file should contain:
   ```bash
   VITE_API_URL=https://api.webypixels.com/api
   ```
   
   This is already set up by default. If you need to use a local backend, change it to:
   ```bash
   VITE_API_URL=http://localhost:3000/api
   ```

4. Start the development server:
```bash
npm run dev
```

The web interface will be available at `http://localhost:5173`

### Building for Production

```bash
npm run build
```

The production build will be in the `dist` directory.

## Technology Stack

- **React 18** - UI framework
- **React Router** - Routing
- **React Bootstrap** - UI components
- **Bootstrap 5** - CSS framework
- **Axios** - HTTP client
- **Recharts** - Charts and graphs
- **React Hot Toast** - Notifications
- **Date-fns** - Date formatting
- **Vite** - Build tool

## Project Structure

```
web-interface/
├── backend/                 # Backend API server
│   ├── config/             # Database configuration
│   ├── data/               # Seed data
│   ├── middleware/         # Authentication middleware
│   ├── models/             # Database models
│   ├── routes/             # API routes
│   ├── utils/              # Utility functions
│   ├── server.js           # Main server file
│   └── package.json        # Backend dependencies
├── src/                     # Frontend React application
│   ├── components/
│   │   ├── common/          # Layout components
│   │   ├── dashboard/        # Dashboard components
│   │   └── users/           # User management components
│   ├── contexts/            # React contexts (Auth)
│   ├── pages/               # Page components
│   ├── services/            # API services
│   ├── utils/               # Utility functions
│   └── styles/              # CSS styles
├── public/                  # Static assets
├── package.json             # Frontend dependencies
├── vite.config.js
└── README.md
```

## Authentication

The web interface uses JWT token-based authentication. Users must log in with credentials that have one of the following roles:
- `super_admin`
- `ceo`
- `general_manager`

Other roles will be denied access to the web interface.

## API Integration

The web interface connects to the backend API at the URL specified in `VITE_API_URL`. All API requests include the JWT token in the Authorization header.

**Important:** Make sure the backend server is running before starting the frontend. The backend must be accessible at the URL specified in `VITE_API_URL`.

## Features by Role

### Super Admin & CEO
- Full access to all features
- Can manage all users, locations, zones, departments
- Can configure system settings
- Can manage holidays

### General Manager
- Can view and manage users (limited)
- Can view and manage locations and zones
- Cannot access system settings
- Cannot manage departments or holidays
- Can approve/reject attendance and leave requests

## Development

### Adding New Features

1. Create new page component in `src/pages/`
2. Add route in `src/App.jsx`
3. Add menu item in `src/components/common/Sidebar.jsx` (with appropriate role check)
4. Create API service functions if needed in `src/services/`

### Styling

- Use React Bootstrap components for UI elements
- Custom CSS in `src/styles/App.css`
- Follow existing patterns for consistency

## Troubleshooting

### CORS Issues
Make sure the backend server allows requests from `http://localhost:5173`

### Authentication Issues
- Check that the JWT token is being stored in localStorage
- Verify the backend API is returning valid tokens
- Ensure the user role is one of the allowed roles

### API Connection Issues
- Verify the backend API is accessible at `https://api.webypixels.com/api`
- Check the `VITE_API_URL` in `.env` file (should be `https://api.webypixels.com/api`)
- Check browser console for CORS or network errors
- Verify your internet connection
- Check if the backend API is running and accessible

## License

Proprietary - WSSC Management System

