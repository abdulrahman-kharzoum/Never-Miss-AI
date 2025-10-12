# Backend Setup Guide

This is the backend service for the web-n8n-auth project, built with FastAPI and MongoDB.

## Prerequisites

- Python 3.8 or higher
- MongoDB installed and running
- MongoDB Compass (optional, for database management)

## Environment Setup

1. Create a virtual environment (recommended):
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Configure environment variables:
   - Copy `.env.example` to `.env` (if not exists)
   - Update the following variables in `.env`:
     ```
     MONGO_URL=mongodb://localhost:27017
     DATABASE_NAME=your_database_name
     API_SECRET_KEY=your-secret-key
     N8N_API_KEY=your-n8n-api-key
     ENCRYPTION_KEY=your-encryption-key-32-chars-long
     ```

## Running the Server

1. Make sure MongoDB is running
2. Start the backend server:
```bash
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

The server will be available at `http://localhost:8001`

## API Documentation

Once the server is running, you can access:
- Swagger UI documentation: `http://localhost:8001/docs`
- ReDoc documentation: `http://localhost:8001/redoc`

## Project Structure

```
backend/
├── .env                 # Environment variables
├── requirements.txt     # Python dependencies
└── server.py           # Main application file
```

## Common Issues

1. If MongoDB is not running, you'll get a connection error
2. Make sure all environment variables are properly set
3. Check if port 8001 is available, if not, change it in the uvicorn command

cd backend
python -m venv venv
venv\Scripts\activate  # On Windows
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8001 --reload