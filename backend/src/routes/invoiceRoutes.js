import express from "express";
import { downloadInvoice, generateInvoice } from "../controller/invoiceController.js";
import { protect, requireRole } from "../middleware/authMiddleware.js";

const invoiceRouter = express.Router();

/**
 * Invoice Routes
 *
 * Responsible for legal document generation (invoices)
 * after successful payment.
 */

/**
 * POST /api/invoices/:paymentId/generate
 *
 * Generates an invoice from a paid bill.
 *
 * Rules:
 * - Only advocates can generate invoices
 * - Payment must be marked as "paid"
 * - Invoice can be generated only once
 */
invoiceRouter.post(
  "/:paymentId/generate",
  protect,
  requireRole("advocate"),
  generateInvoice
);

invoiceRouter.get(
  "/:paymentId/download",
  protect,
  downloadInvoice
);

export default invoiceRouter;
