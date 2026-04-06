import { ensureDbConnected, User } from "@/db";

export async function getCreditsForUser(userId: string): Promise<number> {
  await ensureDbConnected();
  const user = await User.findById(userId);
  return user?.credits ?? 0;
}

export async function deductCredits(userId: string, amount: number): Promise<number> {
  await ensureDbConnected();
  const result = await User.findOneAndUpdate(
    { _id: userId, credits: { $gte: amount } },
    { $inc: { credits: -amount } },
    { new: true }
  );
  if (!result) throw new Error("Insufficient credits");
  return result.credits;
}

export async function addCredits(userId: string, amount: number): Promise<number> {
  await ensureDbConnected();
  const result = await User.findByIdAndUpdate(
    userId,
    { $inc: { credits: amount } },
    { new: true }
  );
  return result?.credits ?? 0;
}
