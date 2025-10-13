# Eco-Coin - AI-Driven E-Waste Management System

A full-stack Next.js application for managing electronic waste with AI-powered device health monitoring and blockchain-based reward system.

## 🚀 Features

- **Device Monitoring**: Track health, battery, and performance of electronic devices
- **AI Predictions**: Get end-of-life predictions for your devices
- **Eco-Coins System**: Earn rewards for recycling devices
- **Smart Notifications**: Receive alerts when devices need recycling
- **Rewards Marketplace**: Redeem eco-coins for discounts and environmental initiatives
- **Dashboard Analytics**: View statistics on devices, earnings, and environmental impact

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **UI**: Tailwind CSS, shadcn/ui components
- **Backend**: Next.js API Routes
- **Database**: MongoDB with Mongoose ODM
- **Styling**: Tailwind CSS with custom animations

## 📋 Prerequisites

- Node.js 18+ installed
- MongoDB installed and running locally (or MongoDB Atlas account)
- npm or pnpm package manager

## 🔧 Installation & Setup

### 1. Clone or navigate to the project directory

```bash
cd eco-coin-app
```

### 2. Install dependencies

```bash
npm install --legacy-peer-deps
```

### 3. Set up environment variables

Copy the `.env.example` file to `.env.local`:

```bash
copy .env.example .env.local
```

Edit `.env.local` and configure your MongoDB connection:

```env
# For local MongoDB
MONGODB_URI=mongodb://localhost:27017/ecocoin

# For MongoDB Atlas
# MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/ecocoin

NEXT_PUBLIC_API_URL=http://localhost:3000
```

### 4. Start MongoDB (if running locally)

Make sure MongoDB is running on your local machine:

```bash
# On Windows (if installed as a service)
net start MongoDB

# Or start manually
mongod
```

### 5. Seed the database with initial data

```bash
npm run seed
```

This will create:
- A default user account
- 3 sample devices
- Notifications
- Rewards
- Transaction history

### 6. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

```
eco-coin-app/
├── app/
│   ├── api/              # API routes
│   │   ├── dashboard/    # Dashboard statistics
│   │   ├── devices/      # Device management
│   │   ├── notifications/# Notification system
│   │   ├── rewards/      # Rewards & redemption
│   │   ├── transactions/ # Transaction history
│   │   └── users/        # User management
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Main dashboard page
├── components/
│   ├── ui/               # shadcn/ui components
│   └── theme-provider.tsx
├── lib/
│   ├── api.ts            # API helper functions
│   ├── mongodb.ts        # Database connection
│   ├── types.ts          # TypeScript types
│   └── utils.ts          # Utility functions
├── models/               # MongoDB/Mongoose models
│   ├── User.ts
│   ├── Device.ts
│   ├── Notification.ts
│   ├── Transaction.ts
│   └── Reward.ts
├── scripts/
│   └── seed.js           # Database seeding script
├── .env.local            # Environment variables (create this)
└── .env.example          # Example environment file
```

## 🔌 API Endpoints

### Users
- `GET /api/users` - Get all users or by email/id
- `POST /api/users` - Create new user
- `PUT /api/users` - Update user
- `DELETE /api/users` - Delete user

### Devices
- `GET /api/devices` - Get devices by userId
- `POST /api/devices` - Add new device
- `PUT /api/devices` - Update device
- `DELETE /api/devices` - Delete device
- `POST /api/devices/recycle` - Recycle device and earn coins

### Notifications
- `GET /api/notifications` - Get notifications by userId
- `POST /api/notifications` - Create notification
- `PUT /api/notifications` - Mark as read
- `DELETE /api/notifications` - Delete notification

### Rewards
- `GET /api/rewards` - Get all rewards
- `POST /api/rewards` - Create reward
- `PUT /api/rewards` - Update reward
- `DELETE /api/rewards` - Delete reward
- `POST /api/rewards/redeem` - Redeem reward

### Transactions
- `GET /api/transactions` - Get transactions by userId
- `POST /api/transactions` - Create transaction

### Dashboard
- `GET /api/dashboard` - Get comprehensive dashboard data

## 💾 Database Models

### User
- Personal information
- Eco-coins balance
- Device statistics
- Environmental impact (CO₂ saved)

### Device
- Device details (name, type, health)
- Performance metrics
- EOL predictions
- Recycling status

### Notification
- Alert messages
- Device references
- Read/unread status

### Transaction
- Earning and redemption history
- Device and reward references
- Timestamps

### Reward
- Reward details
- Cost in eco-coins
- Active/inactive status

## 🧪 Testing

After seeding the database, you can:

1. View the dashboard with 3 devices
2. Check notifications for critical devices
3. Test the recycling flow
4. Redeem rewards with earned coins

## 🚢 Production Build

```bash
npm run build
npm start
```

## 📝 Notes

- The default seeded user email is `mihir.patil22@pccoepune.org`
- Make sure MongoDB is running before starting the app
- Use `npm run seed` to reset the database with fresh data
- The app uses React 19 which may require `--legacy-peer-deps` flag

## 🔐 Security Considerations

For production deployment:
- Add authentication (NextAuth.js, Auth0, etc.)
- Implement API rate limiting
- Add input validation and sanitization
- Use environment-specific MongoDB connections
- Enable MongoDB authentication
- Add CORS protection

## 🤝 Contributing

This is a starter template. Feel free to extend with:
- User authentication
- Real AI/ML models for EOL prediction
- Blockchain integration (Ethereum, Polygon)
- IoT device integration
- Mobile app companion
- Admin dashboard

## 📄 License

MIT License - Feel free to use for personal or commercial projects.
