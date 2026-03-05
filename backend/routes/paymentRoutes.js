import express from "express";
import {
  createTransaction,
  handleNotification,
  checkStatus
} from "../midtrans.js";

const router = express.Router();

// ===============================
// Endpoint buat transaksi
// ===============================
router.post("/create", createTransaction);

// ===============================
// Endpoint notifikasi dari Midtrans
// ===============================
router.post("/notification", handleNotification);

// ===============================
// Endpoint untuk cek status transaksi (legacy)
// ===============================
router.get("/status/:order_id", checkStatus);
router.get("/status/:orderId", checkStatus);

export default router;
