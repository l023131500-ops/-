export interface AppUser {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  productAccess: string[];
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryRow {
  id: number;
  channel: string;
  recipientType: string;
  recipientId: number | null;
  recipientLabel: string;
  toAddress: string;
  subject: string | null;
  body: string;
  callbackUrl: string | null;
  status: string;
  statusDetail: string | null;
  attempts: number;
  endpointUsed: string | null;
  responseText: string | null;
  scheduledAt: string | null;
  sentAt: string | null;
  createdAt: string;
  createdBy: string | null;
}

export interface AutomationConfig {
  id: number;
  key: string;
  label: string;
  description: string | null;
  enabled: boolean;
  endpointUrl: string | null;
  secretRef: string | null;
  config: Record<string, unknown>;
  configJson?: string;
  lastStatus: string | null;
  lastTestedAt: string | null;
  lastResult: string | null;
  updatedAt: string;
}
