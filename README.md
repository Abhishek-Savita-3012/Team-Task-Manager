# Team Task Manager

A full-stack team task manager built with Node.js, ExpressJS, MongoDB, and a plain HTML/CSS/JavaScript frontend.

## Features

- Signup and login with JWT authentication
- Admin and Member roles
- Project creation with team members
- Task creation, assignment, status updates, priorities, and due dates
- Dashboard metrics for projects, tasks, status totals, personal tasks, and overdue work
- REST APIs with validation and MongoDB relationships

## Tech Stack

- Backend: Node.js, ExpressJS
- Database: MongoDB with Mongoose
- Frontend: HTML, CSS, JavaScript
- Auth: JWT and bcrypt password hashing

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create an environment file:

   ```bash
   copy .env.example .env
   ```

3. Make sure MongoDB is running locally, or update `MONGODB_URI` in `.env`.

4. Start the app:

   ```bash
   npm run dev
   ```

5. Open:

   ```text
   http://localhost:5000
   ```

## API Overview

### Auth

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/auth/users` Admin only

### Projects

- `GET /api/projects`
- `POST /api/projects`
- `GET /api/projects/:id`
- `PUT /api/projects/:id`
- `DELETE /api/projects/:id`

### Tasks

- `GET /api/tasks`
- `POST /api/tasks`
- `PUT /api/tasks/:id`
- `DELETE /api/tasks/:id`

### Dashboard

- `GET /api/dashboard`

## Roles

- Admin: can view all projects and users, create projects, assign team members, and manage all tasks.
- Member: can view assigned project work, create tasks inside accessible projects, and update tasks they own or are assigned to.
