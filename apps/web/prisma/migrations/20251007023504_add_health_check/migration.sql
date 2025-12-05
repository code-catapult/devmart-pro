-- CreateTable
CREATE TABLE "public"."health_check" (
    "id" SERIAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ok',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "health_check_pkey" PRIMARY KEY ("id")
);
