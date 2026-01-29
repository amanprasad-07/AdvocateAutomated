import Payment from "../model/payment.js";
import cloudinary from "../utils/cloudinary.js";
import { generateInvoicePdfBuffer } from "../utils/generateInvoicePdf.js";
import axios from "axios"
import { pipeline } from "stream/promises";

/**
 * Generate Invoice Controller
 *
 * Converts a PAID bill into a finalized invoice.
 * This action is irreversible.
 */
export const generateInvoice = async (req, res, next) => {
    try {
        const { paymentId } = req.params;

        const payment = await Payment.findById(paymentId)
            .populate("client", "name email")
            .populate("receivedBy", "name email");

        if (!payment) {
            const err = new Error("Payment not found");
            err.statusCode = 404;
            return next(err);
        }

        if (payment.receivedBy._id.toString() !== req.user._id.toString()) {
            const err = new Error("Access denied");
            err.statusCode = 403;
            return next(err);
        }

        if (payment.status !== "paid") {
            const err = new Error("Invoice can only be generated after payment");
            err.statusCode = 400;
            return next(err);
        }

        if (payment.invoice?.invoiceNumber) {
            const err = new Error("Invoice already generated");
            err.statusCode = 400;
            return next(err);
        }

        /* ---------- Invoice Metadata ---------- */
        const invoiceNumber = `INV-${new Date().getFullYear()}-${Date.now()}`;

        payment.documentType = "invoice";

        payment.invoice = {
            invoiceNumber,
            issuedAt: new Date(),
            sellerSnapshot: {
                name: payment.receivedBy.name,
                email: payment.receivedBy.email,
            },
            buyerSnapshot: {
                name: payment.client.name,
                email: payment.client.email,
            },
        };

        /* ---------- Generate PDF ---------- */
        const pdfBuffer = await generateInvoicePdfBuffer(payment);

        const uploadResult = await uploadInvoiceToCloudinary(
            pdfBuffer,
            invoiceNumber
        );

        payment.invoice.invoiceUrl = uploadResult.secure_url;
        payment.invoice.cloudinaryPublicId = uploadResult.public_id;

        await payment.save();

        res.status(200).json({
            success: true,
            message: "Invoice generated successfully",
            data: payment.invoice,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Upload Invoice PDF to Cloudinary
 */
export const uploadInvoiceToCloudinary = (buffer, invoiceNumber) => {
    return new Promise((resolve, reject) => {
        cloudinary.uploader
            .upload_stream(
                {
                    resource_type: "raw",
                    type: "authenticated", // Makes the file private
                    folder: "invoices",
                    public_id: invoiceNumber,
                    format: "pdf",
                },
                (error, result) => {
                    if (error) return reject(error);
                    resolve(result);
                }
            )
            .end(buffer);
    });
};




export const downloadInvoice = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.paymentId);

    if (!payment?.invoice?.cloudinaryPublicId) {
      return res.status(404).json({ message: "Invoice record not found" });
    }

    // 1. Use the private_download_url helper
    // This helper is much more strict and reliable for signed raw files
    const signedUrl = cloudinary.utils.private_download_url(
      payment.invoice.cloudinaryPublicId,
      "pdf", // Force the extension
      {
        resource_type: "raw",
        type: "upload",
        // We use a timestamp-based expiration to ensure validity
        expires_at: Math.floor(Date.now() / 1000) + 3600, 
      }
    );

    console.log("New Secure URL:", signedUrl);

    // 2. Fetch from Cloudinary
    const response = await axios({
      method: "GET",
      url: signedUrl,
      responseType: "stream",
      // Important: Ensure no previous cache interferes
      headers: { 'Cache-Control': 'no-cache' }
    });

    // 3. Set Response Headers
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="Invoice-${payment.invoice.invoiceNumber}.pdf"`
    );

    // 4. Stream the data
    await pipeline(response.data, res);

  } catch (err) {
    // If we still get a 401, it will print the Cloudinary reason here
    console.error("Cloudinary Access Error:", err.response?.status || "Error", err.message);
    
    if (!res.headersSent) {
      res.status(err.response?.status || 502).json({ 
        message: "Access to Cloudinary denied. Verify your API Secret and Public ID format.",
        details: err.message 
      });
    }
  }
};