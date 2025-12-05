-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "estimated_delivery" TIMESTAMP(3),
ADD COLUMN     "shipping_carrier" TEXT,
ADD COLUMN     "tracking_number" TEXT;
