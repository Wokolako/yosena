import { Request, Response } from 'express';
import { db } from '../data/db';

export const contentController = {
  async getServices(req: Request, res: Response): Promise<void> {
    try {
      const includeInactive = req.query.includeInactive === 'true';
      const services = (await db.getServices()).filter((s) => includeInactive || s.isActive);

      res.status(200).json({ success: true, count: services.length, data: services });
    } catch {
      res.status(500).json({ success: false, error: 'Failed to retrieve consultation services.' });
    }
  },

  async getBlogPosts(req: Request, res: Response): Promise<void> {
    try {
      const { category } = req.query;
      const includeDrafts = req.query.includeDrafts === 'true';

      let posts = (await db.getBlogPosts()).filter((p) => includeDrafts || p.isPublished);

      if (category && category !== 'All') {
        posts = posts.filter((p) => p.category.toLowerCase() === String(category).toLowerCase());
      }

      res.status(200).json({ success: true, count: posts.length, data: posts });
    } catch {
      res.status(500).json({ success: false, error: 'Failed to retrieve journal articles.' });
    }
  },

  async getPolicies(req: Request, res: Response): Promise<void> {
    try {
      const { slug } = req.query;

      // Both queries order policies and their sections in SQL.
      if (slug) {
        const policy = await db.getPolicyBySlug(String(slug));
        if (!policy) {
          res.status(404).json({ success: false, error: `Policy '${slug}' not found.` });
          return;
        }
        res.status(200).json({ success: true, data: policy });
        return;
      }

      const policies = await db.getPolicies();
      res.status(200).json({ success: true, count: policies.length, data: policies });
    } catch {
      res.status(500).json({ success: false, error: 'Failed to retrieve policy documents.' });
    }
  },
};
