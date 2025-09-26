/*
  Warnings:

  - A unique constraint covering the columns `[orderCode]` on the table `Order` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `order` ADD COLUMN `orderCode` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Order_orderCode_key` ON `Order`(`orderCode`);
