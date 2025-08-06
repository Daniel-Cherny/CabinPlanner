# Overview

DreamCabin is a comprehensive cabin design and construction platform that enables users to create, visualize, and build custom cabins. The application combines 2D floor plan design with 3D visualization, offering template-based quick starts, detailed construction guides, and integrated material libraries. Built as a full-stack web application, it serves both novice builders looking for guidance and experienced builders seeking design tools.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
The client-side application uses React with TypeScript, built using Vite as the bundler. The architecture follows a component-based design using shadcn/ui components built on top of Radix UI primitives and styled with Tailwind CSS. The application uses Wouter for client-side routing and TanStack Query for server state management.

Key frontend architectural decisions:
- **Component Library**: Uses shadcn/ui for consistent, accessible UI components with a cabin-themed design system featuring warm earth tones
- **State Management**: TanStack Query handles server state, while local component state manages UI interactions
- **Styling**: Tailwind CSS with custom CSS variables for theming, including cabin-specific color palette
- **3D Visualization**: Prepared for Three.js integration for cabin 3D rendering (placeholder implementation currently)
- **Form Handling**: React Hook Form with Zod validation for type-safe form processing

## Backend Architecture
The server follows an Express.js REST API pattern with TypeScript. The application uses a monorepo structure with shared type definitions between client and server.

Key backend architectural decisions:
- **API Structure**: RESTful endpoints organized by resource type (projects, templates, materials, auth)
- **Middleware Chain**: Custom logging, error handling, and authentication middleware
- **Development Setup**: Vite integration for development with hot module replacement
- **Session Management**: Express sessions with PostgreSQL storage for persistence
- **Error Handling**: Centralized error handling with consistent JSON responses

## Authentication System
The application implements Replit's OpenID Connect authentication system, designed specifically for deployment on Replit infrastructure.

Authentication design choices:
- **OAuth2/OIDC**: Uses Replit's OIDC provider for secure authentication
- **Session Storage**: PostgreSQL-backed sessions with configurable TTL (7 days default)
- **User Management**: Automatic user creation/updates on login with profile synchronization
- **Route Protection**: Middleware-based authentication with automatic redirects

## Database Layer
The application uses Drizzle ORM with PostgreSQL, configured for Neon serverless database integration.

Database architectural decisions:
- **ORM Choice**: Drizzle provides type-safe database queries with minimal overhead
- **Schema Design**: Relational schema supporting users, projects, templates, materials, and construction phases
- **Migration Strategy**: Drizzle Kit for schema migrations with push-based deployment
- **Connection Pooling**: Neon serverless with WebSocket support for optimal performance

## Data Models
The schema supports a comprehensive cabin design workflow:
- **Users**: Profile information integrated with Replit authentication
- **Projects**: User-created cabin designs with dimensions and material specifications
- **Templates**: Pre-built cabin designs (A-frame, tiny house, log cabin, modern styles)
- **Materials**: Categorized building materials with pricing and supplier information
- **Construction Phases**: Step-by-step build guides linked to project types
- **Project Materials**: Many-to-many relationship tracking materials used in specific projects

# External Dependencies

## Database Services
- **Neon Database**: Serverless PostgreSQL database with connection pooling and WebSocket support
- **Drizzle ORM**: Type-safe database toolkit with PostgreSQL adapter

## Authentication Services
- **Replit Authentication**: OpenID Connect provider for user authentication and profile management
- **Passport.js**: Authentication middleware with OpenID Connect strategy

## UI and Styling
- **shadcn/ui**: Component library built on Radix UI primitives
- **Radix UI**: Headless UI components for accessibility and behavior
- **Tailwind CSS**: Utility-first CSS framework with custom theming
- **Lucide React**: Icon library for consistent iconography

## Development Tools
- **Vite**: Build tool and development server with HMR support
- **TypeScript**: Type safety across frontend and backend
- **React Query**: Server state management and caching
- **Zod**: Runtime type validation for forms and API responses

## 3D Visualization (Planned)
- **Three.js**: 3D rendering engine for cabin visualization (integration prepared but not implemented)
- **@types/three**: TypeScript definitions for Three.js

## Build and Deployment
- **esbuild**: Backend bundling for production deployment
- **PostCSS**: CSS processing with Tailwind and autoprefixer
- **Replit Deployment**: Platform-specific optimizations and runtime error handling