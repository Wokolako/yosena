import { Request, Response } from 'express';
import { db, OrderData } from '../data/db';
import { AuthenticatedRequest } from '../auth/authMiddleware';

export const orderController = {
  async createOrder(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const {
        items,
        clientName,
        companyName,
        email,
        paymentMethod,
        shippingService
      } = req.body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        res.status(400).json({
          success: false,
          error: 'Cart items array cannot be empty.'
        });
        return;
      }

      if (!clientName || !email) {
        res.status(400).json({
          success: false,
          error: 'Client name and email are required.'
        });
        return;
      }

      const totalUSD = items.reduce(
        (sum: number, item: any) => sum + (Number(item.priceUSD || 0) * Number(item.quantity || 1)),
        0
      );

      const orderId = `ORD-2026-${Math.floor(100 + Math.random() * 900)}`;
      const newOrder: OrderData = {
        id: orderId,
        userId: req.user?.id,
        memberId: req.user?.memberId,
        clientName: String(clientName).trim(),
        companyName: (companyName || 'Independent Fine Jeweller').trim(),
        email: String(email).trim().toLowerCase(),
        items: items.map((it: any) => ({
          gemstoneId: it.gemstoneId || it.id,
          name: it.name,
          carat: Number(it.carat),
          priceUSD: Number(it.priceUSD),
          quantity: Number(it.quantity || 1)
        })),
        totalUSD,
        paymentMethod: paymentMethod || 'Wire Transfer (Escrow)',
        shippingService: shippingService || 'Ferrari Armored High-Value Courier',
        status: 'Settlement Escrow Awaiting Verification',
        createdAt: new Date().toISOString()
      };

      const saved = await db.createOrder(newOrder);

      res.status(201).json({
        success: true,
        message: 'High-value acquisition order registered.',
        data: saved
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: 'Failed to create order.' });
    }
  },

  async getOrders(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (req.user && req.user.accountRole !== 'admin') {
        const userOrders = await db.getOrdersForUser(req.user.id, req.user.email);
        res.status(200).json({ success: true, count: userOrders.length, data: userOrders });
        return;
      }

      const orders = await db.getOrders();
      res.status(200).json({ success: true, count: orders.length, data: orders });
    } catch (err: any) {
      res.status(500).json({ success: false, error: 'Failed to retrieve orders.' });
    }
  },

  async getOrderById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const order = await db.getOrderById(id);

      if (!order) {
        res.status(404).json({ success: false, error: 'Order not found.' });
        return;
      }

      res.status(200).json({ success: true, data: order });
    } catch (err: any) {
      res.status(500).json({ success: false, error: 'Failed to retrieve order.' });
    }
  }
};
