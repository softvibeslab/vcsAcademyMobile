# Contributing Guidelines

Thank you for your interest in contributing to VCSA! This document provides guidelines and instructions for contributing to the project.

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on what is best for the community
- Show empathy towards other community members

## Getting Started

### Fork and Clone

1. Fork the repository
2. Clone your fork locally
```bash
git clone https://github.com/your-username/Vcsa-.git
cd Vcsa-
```

3. Add upstream remote
```bash
git remote add upstream https://github.com/original-org/Vcsa-.git
```

### Development Setup

Follow the [Installation Guide](Installation.md) to set up your development environment.

## Development Workflow

### Branch Strategy

- `main` - Production-ready code
- `develop` - Development integration branch
- `feature/*` - New features
- `bugfix/*` - Bug fixes
- `hotfix/*` - Urgent production fixes

### Creating a Feature Branch

```bash
git checkout develop
git pull upstream develop
git checkout -b feature/your-feature-name
```

### Making Changes

1. Write clear, commit messages
```bash
git commit -m "feat: add user profile page"
```

2. Follow commit message conventions:
   - `feat:` - New feature
   - `fix:` - Bug fix
   - `docs:` - Documentation changes
   - `style:` - Code style changes
   - `refactor:` - Code refactoring
   - `test:` - Adding tests
   - `chore:` - Maintenance tasks

### Code Style

#### Python (Backend)
- Follow PEP 8 guidelines
- Use Black for formatting
- Use flake8 for linting
- Add type hints with mypy

```bash
# Format code
black backend/

# Lint code
flake8 backend/

# Type check
mypy backend/
```

#### JavaScript/React (Frontend)
- Follow Airbnb style guide
- Use ESLint for linting
- Use Prettier for formatting

```bash
# Lint code
npm run lint

# Format code
npm run format
```

### Testing

#### Backend Tests

```bash
cd backend
pytest tests/
```

#### Frontend Tests

```bash
cd frontend
npm test
```

### Pull Request Process

1. Update your branch with latest develop
```bash
git fetch upstream
git rebase upstream/develop
```

2. Push to your fork
```bash
git push origin feature/your-feature-name
```

3. Create Pull Request
- Provide clear description of changes
- Reference related issues
- Include screenshots for UI changes
- Ensure all CI checks pass

4. Code Review
- Address review feedback
- Keep discussion focused and constructive
- Make requested changes promptly

## Project Structure Guidelines

### Backend Guidelines

- Keep routes focused on HTTP handling
- Business logic in services
- Database models separate from schemas
- Use dependency injection

### Frontend Guidelines

- Pages use default exports
- Components use named exports
- Keep components small and focused
- Use custom hooks for reusable logic
- Follow the existing design system

## Documentation

- Update README for new features
- Add API documentation for new endpoints
- Document complex algorithms
- Keep code comments clear and relevant

## Issue Reporting

### Bug Reports

Include:
- Clear title and description
- Steps to reproduce
- Expected vs actual behavior
- Environment details
- Screenshots if applicable

### Feature Requests

Include:
- Clear use case
- Proposed solution
- Alternative approaches considered
- Potential impact

## Release Process

1. Update version numbers
2. Update CHANGELOG.md
3. Create release tag
4. Deploy to staging
5. Test thoroughly
6. Deploy to production
7. Monitor for issues

## Community Guidelines

- Help newcomers get started
- Review pull requests when possible
- Share knowledge in discussions
- Suggest improvements respectfully

## Recognition

Contributors will be:
- Listed in CONTRIBUTORS.md
- Mentioned in release notes
- Recognized in community updates

## Questions?

- Open an issue for bugs or feature requests
- Start a discussion for general questions
- Check existing documentation first

Thank you for contributing to VCSA! 🚀
