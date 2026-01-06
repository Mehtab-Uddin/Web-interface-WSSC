# WSSC Management System - Backend API

Backend server for the WSSC Management System web interface.

## Setup Instructions

### 1. Install Dependencies

```bash
cd web-interface/backend
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and update with your database credentials:

```bash
cp .env.example .env
```

Edit `.env` file with your MySQL database credentials:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=wsscdb
JWT_SECRET=your-secret-jwt-key
PORT=3000
```

### 3. Database Setup

Make sure MySQL is running and the database exists. You can create it using:

```sql
CREATE DATABASE IF NOT EXISTS wsscdb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Then run the schema file:

```bash
mysql -u your_user -p wsscdb < config/schema.sql
```

### 4. Start the Server

Development mode (with auto-reload):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

The server will start on port 3000 (or the port specified in `.env`).

## API Endpoints

- `GET /` - API information
- `GET /health` - Health check
- `GET /api` - API documentation
- `POST /api/auth/login` - User login
- `GET /api/users` - Get all users
- `GET /api/attendance` - Get attendance records
- `GET /api/dashboard/stats` - Get dashboard statistics
- And many more...

See `server.js` for the complete list of endpoints.

## CORS Configuration

The server is configured to allow requests from:
- `http://localhost:5173` (Vite dev server)
- `http://localhost:3000` (Alternative dev port)
- `http://localhost:8080` (Web app local dev)

For production, update the `allowedOrigins` array in `server.js`.

## Project Structure

```
backend/
├── config/          # Database configuration
├── data/            # Seed data (grades, jobs)
├── middleware/      # Authentication middleware
├── models/          # Database models
├── routes/          # API routes
├── utils/           # Utility functions
├── migrations/      # Database migrations
├── server.js        # Main server file
└── package.json     # Dependencies
```

## Features

- JWT-based authentication
- Role-based access control
- MySQL database integration
- Auto clock-out scheduler
- File upload support
- Push notifications
- Geofencing support

## Development

The backend uses:
- Express.js for the web server
- MySQL2 for database connections
- JWT for authentication
- bcryptjs for password hashing
- CORS for cross-origin requests

## Troubleshooting

### Database Connection Issues

1. Verify MySQL is running
2. Check database credentials in `.env`
3. Ensure the database exists
4. Check firewall settings

### Port Already in Use

If port 3000 is already in use, either:
1. Change `PORT` in `.env`
2. Stop the process using port 3000

### JWT Errors

Make sure `JWT_SECRET` is set in `.env` file.

