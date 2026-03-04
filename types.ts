
export type Priority = 'Low' | 'Medium' | 'High' | 'Critical';
export type Status = 'Open' | 'Scheduled' | 'In Progress' | 'Pending Parts' | 'Completed' | 'Cancelled';
export type AvailabilityStatus = 'Available' | 'Vacation' | 'Sick';

export interface UserAccount {
  id: string;
  name: string;
  role: string;
  email: string;
  avatarColor: string;
}

export interface ServiceCall {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  contactPerson: string;
  city: string;
  address: string;
  phone: string;
  description: string;
  specialEquipment?: string;
  status: Status;
  priority: Priority;
  technicianId?: string;
  openedByUserId: string;
  openedByName: string;
  lastUpdatedByUserId?: string;
  lastUpdatedByName?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  createdAt: string;
  updatedAt: string;
  aiAnalysis?: {
    summary: string;
    suggestedTools: string[];
    estimatedDuration: string;
    suggestedPriority: Priority;
    troubleshootingSteps: string[];
  };
}

export interface Technician {
  id: string;
  name: string;
  specialty: string;
  phone: string;
  active: boolean;
  color: string;
  availabilityStatus: AvailabilityStatus;
  statusStartDate?: string;
  statusEndDate?: string;
}

export interface Customer {
  id: string;
  companyName: string;   // שם הלקוח / חברה
  businessId: string;    // ח.פ. / ע.מ.
  branchNumber?: string; // מספר סניף
  branchName?: string;   // שם סניף
  contactPerson: string; // איש קשר
  phone: string;         // טלפון איש קשר
  email: string;
  address: string;
  city: string;
}
