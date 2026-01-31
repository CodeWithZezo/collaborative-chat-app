# Project Folder Structure

```
team-chat-app/
│
├── src/                          # Source code
│   ├── config/                   # Configuration files (database, redis, jwt, etc.)
│   ├── controllers/              # HTTP & WebSocket request handlers
│   ├── services/                 # Business logic layer
│   ├── repositories/             # Data access layer (TypeORM repositories)
│   ├── models/                   # Database entities/models
│   ├── middlewares/              # Express middlewares (auth, error handling, etc.)
│   ├── utils/                    # Helper functions and utilities
│   ├── types/                    # TypeScript interfaces and types
│   ├── validators/               # Request validation schemas
│   ├── events/                   # WebSocket event handlers
│   ├── tests/                    # Test files and test utilities
│   └── server.ts                 # Application entry point
│
├── dist/                         # Compiled JavaScript (generated)
├── logs/                         # Application logs (generated)
├── uploads/                      # User uploaded files (generated)
├── node_modules/                 # Dependencies (generated)
│
├── .env                          # Environment variables (not in git)
├── .env.example                  # Environment variables template
├── .gitignore                    # Git ignore rules
├── .eslintrc.json               # ESLint configuration
├── tsconfig.json                 # TypeScript configuration
├── jest.config.js                # Jest testing configuration
├── nodemon.json                  # Nodemon configuration
├── package.json                  # NPM dependencies and scripts
└── README.md                     # Project documentation
```

## Module Organization

### config/
- database.config.ts
- redis.config.ts
- jwt.config.ts
- logger.config.ts
- socket.config.ts

### controllers/
- auth.controller.ts
- user.controller.ts
- message.controller.ts
- channel.controller.ts
- task.controller.ts
- notification.controller.ts
- search.controller.ts
- audit.controller.ts

### services/
- auth.service.ts
- user.service.ts
- message.service.ts
- channel.service.ts
- task.service.ts
- notification.service.ts
- mention.service.ts
- search.service.ts
- activity.service.ts
- audit.service.ts

### repositories/
- user.repository.ts
- message.repository.ts
- channel.repository.ts
- task.repository.ts
- notification.repository.ts
- activity.repository.ts
- audit.repository.ts

### models/
- user.model.ts
- message.model.ts
- channel.model.ts
- task.model.ts
- notification.model.ts
- mention.model.ts
- activity.model.ts
- audit.model.ts
- attachment.model.ts

### middlewares/
- auth.middleware.ts
- error.middleware.ts
- validation.middleware.ts
- rateLimit.middleware.ts
- logger.middleware.ts

### utils/
- response.util.ts
- encryption.util.ts
- tokenManager.util.ts
- dateHelper.util.ts
- fileUpload.util.ts

### types/
- express.d.ts (custom Express types)
- socket.d.ts (custom Socket.IO types)
- api.interface.ts
- enums.ts

### validators/
- auth.validator.ts
- user.validator.ts
- message.validator.ts
- channel.validator.ts
- task.validator.ts

### events/
- socket.handler.ts
- message.handler.ts
- notification.handler.ts
- presence.handler.ts