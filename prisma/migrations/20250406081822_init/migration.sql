-- CreateTable
CREATE TABLE "QueueProductSystem" (
    "queue_id" TEXT NOT NULL,
    "product_code" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QueueProductSystem_pkey" PRIMARY KEY ("queue_id")
);
