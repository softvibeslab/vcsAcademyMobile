# Getting Started with VCSA

This guide will help you set up and run the VCSA platform locally for development.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **Python** (v3.9 or higher)
- **MongoDB** (v5.0 or higher)
- **Git** (for version control)
- **Yarn** (recommended for frontend)

## Initial Setup

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/Vcsa-.git
cd Vcsa-
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Edit .env with your configuration
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
yarn install

# Create .env file
cp .env.example .env
# Edit .env with your backend URL
```

### 4. Database Setup

Ensure MongoDB is running:

```bash
# On Linux/Mac with systemd
sudo systemctl start mongod

# On macOS with Homebrew
brew services start mongodb-community

# Or run directly
mongod --dbpath /path/to/data
```

## Running the Application

### Start Backend

```bash
cd backend
uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

The backend will be available at `http://localhost:8000`

### Start Frontend

In a new terminal:

```bash
cd frontend
yarn start
```

The frontend will be available at `http://localhost:3000`

## Default Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@vcsa.com | admin123 |
| Demo User | demo@vcsa.com | demo123 |

## Next Steps

- Explore the [API Documentation](API-Reference.md)
- Learn about the [Architecture](Architecture.md)
- Review [Contributing Guidelines](Contributing.md)

## Troubleshooting

### Backend won't start
- Check if MongoDB is running
- Verify your `.env` configuration
- Check port 8000 is not in use

### Frontend can't connect to backend
- Verify `REACT_APP_BACKEND_URL` in frontend `.env`
- Check if backend is running
- Check CORS settings in backend

### Database connection errors
- Ensure MongoDB is running
- Verify connection string in `.env`
- Check database credentials
