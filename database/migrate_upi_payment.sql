-- ============================================================
-- Migration: Add UPI Payment Proof Verification
-- Run this on an EXISTING framekraft_db database
-- (Skip if setting up fresh — schema.sql already has these)
-- ============================================================
USE framekraft_db;

-- Update payment_status enum to include 'submitted' and 'rejected'
ALTER TABLE orders
  MODIFY COLUMN payment_status ENUM('pending', 'submitted', 'paid', 'rejected', 'failed') DEFAULT 'pending';

-- Add proof-of-payment tracking columns
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_proof_image VARCHAR(255) DEFAULT NULL AFTER payment_status,
  ADD COLUMN IF NOT EXISTS payment_proof_submitted_at TIMESTAMP NULL DEFAULT NULL AFTER payment_proof_image,
  ADD COLUMN IF NOT EXISTS payment_verified_at TIMESTAMP NULL DEFAULT NULL AFTER payment_proof_submitted_at,
  ADD COLUMN IF NOT EXISTS payment_rejection_reason VARCHAR(255) DEFAULT NULL AFTER payment_verified_at,
  ADD COLUMN IF NOT EXISTS upi_transaction_id VARCHAR(100) DEFAULT NULL AFTER payment_rejection_reason;

-- Add UPI settings (your payment QR + ID shown at checkout)
INSERT INTO settings (setting_key, setting_value) VALUES
  ('upi_id', 'yourname@upi'),
  ('upi_payee_name', 'FrameKraft Store'),
  ('upi_qr_image', '')
ON DUPLICATE KEY UPDATE setting_value = setting_value;
