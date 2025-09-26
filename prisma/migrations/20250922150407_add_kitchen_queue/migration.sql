/*
  Warnings:

  - You are about to drop the column `itemId` on the `kitchenqueue` table. All the data in the column will be lost.
  - You are about to drop the column `orderId` on the `kitchenqueue` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `kitchenqueue` DROP COLUMN `itemId`,
    DROP COLUMN `orderId`,
    ADD COLUMN `status` VARCHAR(191) NOT NULL DEFAULT 'pending';
