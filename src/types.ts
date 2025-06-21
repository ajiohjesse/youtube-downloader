import { VIDEO_STATUS } from "./server/utils";

export type Video = {
  id: number;
  title: string;
  url: string;
  status: keyof typeof VIDEO_STATUS;
  size?: string;
  createdAt: string;
  updatedAt: string;
};
