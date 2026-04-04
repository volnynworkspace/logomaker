export interface SelectGeneratedImage {
  _id: string;
  id: string;
  image_url: string;
  prompt: string;
  category: string;
  style: string;
  color_tone: string;
  aspect_ratio: string;
  size: string;
  username: string;
  userId: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}
