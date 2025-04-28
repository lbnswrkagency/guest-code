# Coding Style Guidelines

## Frontend (React) Guidelines

### Component Structure

- Each component should have its own directory containing:
  - Component JS/TS file
  - Component CSS file
  - Any additional component-specific files

### Naming Conventions

- Use clear, descriptive class names that reflect the component's purpose
- Follow the pattern: `[component-name]-[element-type]`
- Examples:
  - `search-header`
  - `search-title`
  - `search-button`
  - `search-wrapper`
  - `locations-header`
  - `locations-title`
  - `locations-button`
  - `locations-wrapper`

### Component Organization

- Keep components modular and focused on a single responsibility
- Use semantic HTML elements
- Maintain consistent spacing and indentation
- Group related styles together in CSS files

## Backend (Node.js) Guidelines

### Project Structure

- Follow the MVC (Model-View-Controller) pattern
- Each feature/module should have:
  - Controller file (`[feature].controller.js`)
  - Routes file (`[feature].routes.js`)
  - Model file (`[feature].model.js`)

### File Organization

- Keep related files together in feature-based directories
- Maintain clear separation of concerns between models, controllers, and routes
- Use consistent naming conventions across all backend files

### Code Style

- Use async/await for asynchronous operations
- Implement proper error handling
- Follow RESTful API design principles
- Use meaningful variable and function names
- Add appropriate comments for complex logic

## General Guidelines

- Write clean, maintainable code
- Follow DRY (Don't Repeat Yourself) principle
- Use consistent formatting throughout the codebase
- Document complex logic and important decisions
- Keep code modular and reusable

## Important Note

- Only implement what is explicitly requested
- Stay focused on the specific task at hand
- Don't add unnecessary features or complexity
- Work only with the files that are part of the current task
- Avoid over-engineering or adding extra functionality
