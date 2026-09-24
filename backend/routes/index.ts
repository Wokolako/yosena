import { Router } from 'express';
import authRoutes from './authRoutes';
import gemstoneRoutes from './gemstoneRoutes';
import bookingRoutes from './bookingRoutes';
import memoRoutes from './memoRoutes';
import quoteRoutes from './quoteRoutes';
import orderRoutes from './orderRoutes';
import contentRoutes from './contentRoutes';

const apiRouter = Router();

// Health check endpoint
apiRouter.get('/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    service: 'YosenaMora Vaults API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Mount module routes
apiRouter.use('/auth', authRoutes);
apiRouter.use('/gemstones', gemstoneRoutes);
apiRouter.use('/bookings', bookingRoutes);
apiRouter.use('/memos', memoRoutes);
apiRouter.use('/quotes', quoteRoutes);
apiRouter.use('/orders', orderRoutes);
apiRouter.use('/', contentRoutes);

export default apiRouter;
