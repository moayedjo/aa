export interface Slide {
  id: string;
  type: "title" | "content" | "two-column" | "image" | "bullets";
  title: string;
  subtitle?: string;
  content?: string[];
  imageUrl?: string;
  layout: "default" | "split" | "center";
  backgroundColor?: string;
  textColor?: string;
}

export interface PresentationData {
  id: string;
  title: string;
  slides: Slide[];
  templateId?: string;
  theme: {
    primary: string;
    secondary: string;
    font: string;
  };
  speakerNotes: Record<string, string>;
}

export interface Template {
  id: string;
  title: string;
  category: string;
  thumbnailUrl: string;
  isPro: boolean;
  colors: { primary: string; secondary: string };
  fonts: { heading: string; body: string };
  fileUrl?: string;
}

export interface AIModel {
  id: string;
  name: string;
  icon: string;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  subscription_tier: "free" | "basic" | "plus" | "ultra";
  current_tokens: number;
}
