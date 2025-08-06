# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

## 🚀 Features

- **AI-Powered Predictions**: Advanced machine learning models for sports betting insights
- **Real-time Data**: Live odds and match information via Google Search integration
- **Performance Tracking**: Virtual betting dashboard with P/L tracking
- **Strategy Builder**: Custom AI tip generation with configurable parameters
- **Multi-Sport Support**: Football, Basketball, Tennis, and more
- **Responsive Design**: Optimized for desktop and mobile devices

## 📋 Prerequisites

- **Node.js** (v16 or higher)
- **Gemini API Key** (for AI predictions)
- **Supabase Account** (for data persistence)

## Run Locally

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Setup

#### Gemini API Configuration
1. Get your Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a `.env.local` file in the root directory:
```env
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

#### Supabase Configuration
1. Create a new project at [Supabase](https://supabase.com)
2. Go to Settings > API to get your project URL and anon key
3. Update `config.ts` with your Supabase credentials:
```typescript
export const config = {
  supabaseUrl: 'your_supabase_project_url',
  supabaseAnonKey: 'your_supabase_anon_key',
  // ... other config
};
```

### 3. Database Setup
1. In your Supabase project, go to the SQL Editor
2. Run the database setup script provided in the app (shown when tables are missing)
3. This creates all necessary tables with proper Row Level Security (RLS)

### 4. Run the Application
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## 🏗️ Architecture

### Frontend Stack
- **React 19** with TypeScript
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Chart.js** for data visualization
- **Vite** for build tooling

### Backend Services
- **Supabase** for database and real-time features
- **Google Gemini AI** for predictions and analysis
- **Google Search** integration for live data

### Key Components
- **Prediction Engine**: AI-powered match analysis
- **Strategy Builder**: Custom betting strategy creation
- **Performance Dashboard**: Virtual P/L tracking
- **Caching System**: Optimized data fetching
- **Error Handling**: Comprehensive error boundaries

## 🔧 Configuration

### Cache Settings
```typescript
// utils/caching.ts
const CACHE_CONFIG = {
  DEFAULT_DURATION_MS: 15 * 60 * 1000, // 15 minutes
  MAX_CACHE_SIZE: 50,
  CLEANUP_THRESHOLD: 0.8,
};
```

### API Configuration
```typescript
// services/geminiService.ts
const API_CONFIG = {
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
  REQUEST_TIMEOUT: 30000,
};
```

## 🧪 Testing

```bash
# Run tests (when implemented)
npm test

# Run type checking
npx tsc --noEmit

# Run linting
npm run lint
```

## 📦 Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## 🚀 Deployment

### Netlify (Recommended)
1. Connect your repository to Netlify
2. Set environment variables in Netlify dashboard
3. Deploy automatically on push to main branch

### Manual Deployment
1. Build the project: `npm run build`
2. Upload the `dist` folder to your hosting provider
3. Configure environment variables on your hosting platform

## 🔒 Security Considerations

- **API Keys**: Never commit API keys to version control
- **Row Level Security**: Enabled on all Supabase tables
- **Input Validation**: Comprehensive validation on all user inputs
- **Error Handling**: Secure error messages that don't leak sensitive information

## 🐛 Troubleshooting

### Common Issues

**"Database tables missing" error**
- Run the SQL setup script in your Supabase SQL Editor
- Ensure your Supabase credentials are correct

**API quota exceeded**
- Check your Gemini API usage limits
- Implement rate limiting if needed

**Caching issues**
- Clear browser localStorage
- Use the cache management utilities in the app

### Debug Mode
Set `NODE_ENV=development` to enable:
- Detailed error messages
- Console logging
- Development-only features

## 📊 Performance Optimization

- **Memoization**: React.memo used for expensive components
- **Code Splitting**: Lazy loading for route components
- **Caching**: Intelligent caching with cleanup
- **Debouncing**: User input debouncing for better UX

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## ⚠️ Disclaimer

This application is for educational and entertainment purposes only. All predictions are AI-generated and not guaranteed. Please gamble responsibly and within your means.

## 📞 Support

For support, please open an issue on GitHub or contact the development team.