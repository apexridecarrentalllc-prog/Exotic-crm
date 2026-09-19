# IE Manager

A comprehensive Import/Export management system built with Next.js, MongoDB, and Prisma.

## Features

- User authentication and role-based access control
- Company and contact management
- Shipment tracking with stage management
- Invoice generation and payment tracking
- Document management
- Real-time notifications
- Audit logging
- Email notifications
- Export reports

## Tech Stack

- **Frontend**: Next.js 14, React, Tailwind CSS, Radix UI
- **Backend**: Next.js API Routes, NextAuth.js
- **Database**: MongoDB with Prisma ORM
- **PDF Generation**: @react-pdf/renderer
- **Email**: Nodemailer

## Getting Started

### Prerequisites

- Node.js 20 or higher
- MongoDB instance (local or MongoDB Atlas)
- npm, yarn, pnpm, or bun

### Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Set up environment variables by copying `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

4. Configure your environment variables in `.env.local`:
```env
DATABASE_URL=mongodb+srv://username:password@cluster.mongodb.net/ie-manager?retryWrites=true&w=majority
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:3000
```

5. Generate Prisma client:
```bash
npx prisma generate
```

6. (Optional) Seed the database with sample data:
```bash
npm run seed
```

### Running the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Build for Production

```bash
npm run build
npm start
```

## Deployment

This project is configured for deployment on Render using the provided `render.yaml` file.

### Quick Deploy to Render

1. Push your code to GitHub
2. Go to Render Dashboard and create a new Blueprint
3. Connect your GitHub repository
4. Render will automatically detect `render.yaml`
5. Configure your environment variables
6. Deploy

For detailed deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md).

## Default Users (after seeding)

- **Super Admin**: super.admin@iemanager.com / SuperAdmin@123
- **Admin**: admin@iemanager.com / Admin@123
- **Accounts Manager**: accounts@iemanager.com / Accounts@123
- **Operations Staff**: operations@iemanager.com / Ops@123
- **View Only**: manager@iemanager.com / Manager@123

## Project Structure

```
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── seed.ts                # Database seeding script
├── src/
│   ├── app/                   # Next.js app directory
│   ├── components/            # React components
│   ├── lib/                   # Utility functions
│   └── hooks/                 # Custom React hooks
├── public/                    # Static assets
├── render.yaml                # Render deployment configuration
└── package.json              # Dependencies and scripts
```

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [NextAuth.js Documentation](https://next-auth.js.org)
- [Render Documentation](https://render.com/docs)
