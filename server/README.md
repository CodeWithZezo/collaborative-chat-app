# Team Collaboration Chat Application

Enterprise-level team collaboration platform with real-time messaging, task management, mentions, notifications, activity logs, and comprehensive search capabilities.

## 🚀 Features

- **Real-time Messaging**: WebSocket-based instant messaging with Socket.IO
- **Task Management**: Integrated task creation and assignment within conversations
- **User Mentions**: @mention system with real-time notifications
- **Notifications**: Push notifications for messages, mentions, and task assignments
- **Activity & Audit Logs**: Comprehensive logging of all system activities
- **Message Search**: Full-text search across all messages
- **Enterprise Security**: JWT authentication, rate limiting, and role-based access control
- **Scalability**: Redis pub/sub for horizontal scaling
- **File Uploads**: Support for file attachments in messages

## 🏗️ Architecture

```
Clean Architecture / Layered Approach
├── Controllers (HTTP/WebSocket handlers)
├── Services (Business logic)
├── Repositories (Data access)
├── Models (Database entities)
└── Utilities (Helpers, validators, etc.)
```

## 🛠️ Tech Stack

- **Runtime**: Node.js (v18+)
- **Language**: TypeScript
- **Framework**: Express.js
- **WebSocket**: Socket.IO
- **Database**: PostgreSQL with TypeORM
- **Cache/Queue**: Redis & Bull
- **Authentication**: JWT
- **Logging**: Winston
- **Testing**: Jest
- **Validation**: Joi & class-validator

## 📋 Prerequisites

- Node.js >= 18.0.0
- PostgreSQL >= 14
- Redis >= 6.0
- npm >= 9.0.0

## 🔧 Installation

1. Clone the repository
```bash
git clone <repository-url>
cd team-chat-app
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Set up database
```bash
# Create PostgreSQL database
createdb team_chat_db

# Run migrations
npm run migration:run
```

5. Start Redis server
```bash
redis-server
```

## 🚀 Running the Application

### Development Mode
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm start
```

### Run Tests
```bash
npm test
npm run test:watch
```

### Linting
```bash
npm run lint
npm run lint:fix
```

## 📁 Project Structure

```
team-chat-app/
├── src/
│   ├── config/          # Configuration files
│   ├── controllers/     # HTTP & WebSocket controllers
│   ├── services/        # Business logic
│   ├── repositories/    # Data access layer
│   ├── models/          # Database entities
│   ├── middlewares/     # Express middlewares
│   ├── utils/           # Utility functions
│   ├── types/           # TypeScript types/interfaces
│   ├── validators/      # Request validators
│   ├── events/          # WebSocket events
│   ├── tests/           # Test files
│   └── server.ts        # Application entry point
├── dist/                # Compiled JavaScript
├── logs/                # Application logs
├── uploads/             # Uploaded files
└── package.json
```

## 🔐 Environment Variables

See `.env.example` for all available configuration options.

## 📝 API Documentation

API documentation will be available at `/api-docs` when running the application (Swagger/OpenAPI).

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- path/to/test.spec.ts
```

## 🔒 Security Features

- JWT-based authentication
- Bcrypt password hashing
- Helmet.js security headers
- Rate limiting
- CORS configuration
- Input validation and sanitization
- SQL injection prevention (TypeORM)
- XSS protection

## 📊 Monitoring & Logging

- Winston logger with daily rotation
- Structured logging (JSON format)
- Request/Response logging with Morgan
- Error tracking and alerting

## 🚢 Deployment

The application is containerization-ready. Docker and Kubernetes configurations can be added based on deployment requirements.

## 📄 License

MIT

## 👥 Contributors

Your Team

---

Built with ❤️ using Node.js & TypeScript