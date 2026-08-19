export interface FieldDef {
  key: string;
  label: string;
  placeholder: string;
  type: "text" | "textarea";
  required: boolean;
  maxLength?: number;
}
export interface AdType {
  id: string;
  name: string;
  description: string;
  icon: string;
  fields: FieldDef[];
}
export interface AdStyle {
  id: string;
  name: string;
  description: string;
  bgPromptEn: string;
  palette: { text: string; subtext: string; accent: string; overlay: string };
  font: string;
}
export interface Community {
  id: string;
  name: string;
  moderation: string;
}
export interface AspectRatio {
  id: string;
  name: string;
  w: number;
  h: number;
}
export interface AppConfig {
  adTypes: AdType[];
  styles: Record<string, AdStyle[]>;
  communities: Community[];
  aspectRatios: AspectRatio[];
}

export interface StageEvent {
  stage: string;
  status: string;
  message: string;
  progress: number;
  data?: any;
}
