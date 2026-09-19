# Deployment Guide for Render

## Prerequisites

1. A MongoDB Atlas account (or other MongoDB hosting)
2. A Render account
3. All environment variables configured

## Environment Variables

You'll need to configure these environment variables in Render:

### Required
- `DATABASE_URL` - Your MongoDB connection string
- `NEXTAUTH_SECRET` - Random string for NextAuth encryption
- `NEXTAUTH_URL` - Your deployed application URL (e.g., https://ie-manager.onrender.com)

### Optional (Company Branding)
- `NEXT_PUBLIC_COMPANY_NAME` - Default company name for invoices
- `NEXT_PUBLIC_COMPANY_TAGLINE` - Default company tagline
- `NEXT_PUBLIC_INVOICE_TERMS` - Default invoice terms and conditions

### Optional (Email Configuration)
- `EMAIL_HOST` - SMTP server host (e.g., smtp.gmail.com)
- `EMAIL_PORT` - SMTP port (e.g., 587)
- `EMAIL_USER` - SMTP username
- `EMAIL_PASSWORD` - SMTP password
- `EMAIL_FROM` - Default sender email address

## Deployment Steps

### 1. Prepare MongoDB Database

1. Create a MongoDB Atlas account if you don't have one
2. Create a new cluster (free tier is sufficient for development)
3. Create a database user with read/write permissions
4. Whitelist IP addresses (or use 0.0.0.0/0 for Render)
5. Get your connection string in the format:
   ```
   mongodb+srv://username:password@cluster.mongodb.net/database_name?retryWrites=true&w=majority
   ```

### 2. Push Code to GitHub

1. Create a new GitHub repository
2. Push your code to the repository
3. Make sure `render.yaml` is included in the repository

### 3. Deploy to Render

#### Option A: Using render.yaml (Recommended)

1. Go to Render Dashboard
2. Click "New +" → "Blueprint"
3. Connect your GitHub repository
4. Render will automatically detect `render.yaml` and configure the service
5. Review the configuration and click "Apply"

#### Option B: Manual Configuration

1. Go to Render Dashboard
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: ie-manager
   - **Environment**: Node
   - **Build Command**: `npm install && npx prisma generate && npm run build`
   - **Start Command**: `npm start`
   - **Node Version**: 20
5. Add environment variables in the "Advanced" section
6. Click "Create Web Service"

### 4. Configure Environment Variables

After deployment, go to your service settings and add the environment variables:

1. Click on your service in Render Dashboard
2. Go to "Environment" tab
3. Add each required environment variable
4. Click "Save Changes"
5. The service will automatically redeploy

### 5. Seed the Database (Optional)

If you want to seed the database with sample data:

1. SSH into your Render service (optional - Render doesn't provide direct SSH)
2. Or run the seed script locally with your production DATABASE_URL:
   ```bash
   DATABASE_URL="your-production-url" npm run seed
   ```

## Troubleshooting

### Build Failures

If the build fails:

1. Check the build logs in Render Dashboard
2. Ensure Node.js version 20 is specified
3. Verify all dependencies are in package.json
4. Check that Prisma schema is valid

### Database Connection Issues

If you can't connect to MongoDB:

1. Verify DATABASE_URL is correct
2. Check MongoDB Atlas whitelist includes Render's IP ranges
3. Ensure database user has proper permissions
4. Test connection string locally first

### Runtime Errors

If the app starts but shows errors:

1. Check the service logs in Render Dashboard
2. Verify all environment variables are set
3. Ensure NEXTAUTH_URL matches your actual domain
4. Check that NextAuth configuration is correct

## Post-Deployment Checklist

- [ ] Application loads successfully
- [ ] Login page works
- [ ] Database connection is established
- [ ] Static assets (images, fonts) load correctly
- [ ] API routes respond correctly
- [ ] Email sending works (if configured)
- [ ] File uploads work (if using file storage)

## Security Considerations

1. Never commit `.env` files to version control
2. Use strong passwords for database users
3. Keep NEXTAUTH_SECRET secure and random
4. Enable MongoDB Atlas network restrictions
5. Regularly update dependencies
6. Review Render logs for suspicious activity

## Scaling

For production use:

1. Upgrade to paid Render tier for better performance
2. Consider using Render's PostgreSQL instead of MongoDB for better performance
3. Implement Redis for session storage if using multiple instances
4. Set up monitoring and alerting
5. Configure backups (MongoDB Atlas provides automated backups)

## Support

For issues specific to this application, check the GitHub repository or contact the development team.

For Render-specific issues, consult [Render Documentation](https://render.com/docs).

For MongoDB issues, consult [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com).
