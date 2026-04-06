import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function getCreditsForUser(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  return user?.credits ?? 0;
}

export async function deductCredits(userId: string, amount: number): Promise<number> {
  // Atomic: only deducts if credits >= amount
  const result = await prisma.$executeRaw`
    UPDATE users SET credits = credits - ${amount}, updated_at = NOW()
    WHERE id = ${userId} AND credits >= ${amount}
  `;
  if (result === 0) throw new Error("Insufficient credits");
  const user = await prisma.user.findUnique({ where: { id: userId } });
  return user?.credits ?? 0;
}

export async function addCredits(userId: string, amount: number): Promise<number> {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { credits: { increment: amount } },
  });
  return user.credits;
}
