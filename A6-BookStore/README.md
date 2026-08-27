# BookNest - Online Book Store

Responsive online book store built with Node.js, Express and MongoDB.

## Features
- Home page
- Login page
- Registration page with MongoDB
- Responsive catalogue
- Search, category filter and sorting
- Secure password hashing with bcrypt
- Session-based authentication
- Sample book seeding endpoint

## Requirements
- Node.js 18+
- MongoDB local installation or MongoDB Atlas

## Setup

1. Open this project folder in VS Code.
2. Run:

```bash
npm install
```

3. Copy `.env.example` to `.env` and update `MONGO_URI` if required.

For local MongoDB:
`MONGO_URI=mongodb://127.0.0.1:27017/bookstore`

For MongoDB Atlas, replace it with your Atlas connection string.

4. Start MongoDB.
5. Start the application:

```bash
npm start
```

For development:

```bash
npm run dev
```

6. Open:
`http://localhost:3000`

## Insert sample books

After the server starts, open this URL once in the browser:

`http://localhost:3000/api/books/seed`

Then open the catalogue.

## Database collections

- `users`
- `books`

Passwords are hashed using bcrypt and are never stored as plain text.

## Notes

The Add to Cart button is currently a frontend demonstration. Cart/order functionality can be added as the next module.
