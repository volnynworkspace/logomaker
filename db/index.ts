import mongoose, { Schema, models, model } from 'mongoose';
import { config } from 'dotenv';

// Load env from default locations (.env, .env.local)
config();

const MONGODB_URI = process.env.MONGODB_URI as string;

if (!MONGODB_URI) {
  throw new Error('MONGODB_URI is not defined in environment variables');
}

let isConnected = false;

export async function ensureDbConnected(): Promise<void> {
  if (isConnected) return;
  if (mongoose.connection.readyState === 1) {
    isConnected = true;
    return;
  }
  await mongoose.connect(MONGODB_URI);
  isConnected = true;
}

const LogoSchema = new Schema(
  {
    image_url: { type: String, required: true },
    primary_color: { type: String, required: true },
    background_color: { type: String, required: true },
    username: { type: String, required: true },
    userId: { type: String, required: true },
    is_edited: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } }
);

// Compound index: covers find({ userId }).sort({ createdAt: -1 }) without in-memory sort
LogoSchema.index({ userId: 1, createdAt: -1 });

export const Logo = models.Logo || model('Logo', LogoSchema);

const GeneratedImageSchema = new Schema(
  {
    image_url: { type: String, required: true },
    prompt: { type: String, required: true },
    category: { type: String, required: true },
    style: { type: String, required: true },
    color_tone: { type: String, default: '' },
    aspect_ratio: { type: String, default: '1:1' },
    size: { type: String, default: '1024x1024' },
    username: { type: String, required: true },
    userId: { type: String, required: true },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } }
);

GeneratedImageSchema.index({ userId: 1, createdAt: -1 });

export const GeneratedImage = models.GeneratedImage || model('GeneratedImage', GeneratedImageSchema);

