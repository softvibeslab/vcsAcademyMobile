# VCSA Documentation Wiki

Welcome to the Vacation Club Sales Academy (VCSA) documentation wiki. This platform serves as the "Sales Operating System" for vacation club/timeshare sales professionals.

## Quick Links

- [Getting Started](Getting-Started.md)
- [Installation Guide](Installation.md)
- [API Documentation](API-Reference.md)
- [Architecture Overview](Architecture.md)
- [Contributing Guidelines](Contributing.md)

## About VCSA

**Strategic Positioning**: The Performance Operating System for Vacation Club Sales Teams

### Target Users
- **Sales Representatives** (primary) - Improve floor performance
- **Sales Managers** (Phase 2) - Team training tools
- **Industry Leaders** (Phase 3) - Strategic content

### Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | React 19 + Tailwind CSS + Framer Motion |
| Backend | FastAPI (Python) |
| Database | MongoDB |
| Authentication | Email/Password + Google OAuth |
| Payments | Stripe |

## Project Structure

```
Vcsa-/
├── backend/           # FastAPI backend
│   ├── server.py      # Main application
│   ├── phase1_routes.py # Phase 1 development system
│   └── tests/         # Backend tests
├── frontend/          # React frontend
│   ├── src/
│   │   ├── pages/     # Page components
│   │   └── components/ # Reusable components
│   └── public/        # Static assets
└── docs/             # Documentation
```

## Current Status

- **Version**: 1.0.0
- **Latest Release**: Phase 1 Complete
- **Active Branch**: `main`
- **Development**: Feature branches for enhancements

## Support

For issues, questions, or contributions, please refer to our [Contributing Guidelines](Contributing.md).
