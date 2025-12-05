-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "refund_amount" INTEGER,
ADD COLUMN     "refund_reason" TEXT,
ADD COLUMN     "refunded_at" TIMESTAMP(3);
