/*
  Warnings:

  - You are about to drop the column `embeddingId` on the `Chunk` table. All the data in the column will be lost.
  - Added the required column `chunkIndex` to the `Chunk` table without a default value. This is not possible if the table is not empty.
  - Added the required column `embedding` to the `Chunk` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `Chunk` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Chunk" DROP COLUMN "embeddingId",
ADD COLUMN     "chunkIndex" INTEGER NOT NULL,
ADD COLUMN     "embedding" JSONB NOT NULL,
ADD COLUMN     "tenantId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "Chunk" ADD CONSTRAINT "Chunk_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
