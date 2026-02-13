// Comprehensive Mock Data for Smart AI Receptionist System

export interface Message {
  id: string;
  sender: 'patient' | 'ai';
  content: string;
  timestamp: string;
}

export interface Conversation {
  id: string;
  patient: string;
  patientPhone: string;
  startTime: string;
  endTime: string;
  duration: string;
  type: 'booking' | 'inquiry' | 'reschedule' | 'cancellation';
  status: 'success' | 'transferred' | 'failed';
  summary: string;
  messages: Message[];
}

export interface Appointment {
  id: string;
  patient: string;
  patientPhone: string;
  time: string;
  doctor: string;
  type: string;
  status: 'confirmed' | 'pending' | 'completed' | 'cancelled';
  notes?: string;
}

export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  phone: string;
  lastVisit: string;
  upcomingAppointment?: string;
  medicalHistory: string[];
}

export interface Notification {
  id: string;
  patient: string;
  phone: string;
  type: 'SMS' | 'Email';
  message: string;
  status: 'delivered' | 'scheduled' | 'failed';
  sentAt: string | null;
  scheduledFor: string | null;
}

export const mockConversations: Conversation[] = [
  {
    id: '1',
    patient: 'John Smith',
    patientPhone: '555-0101',
    startTime: '10:45 AM',
    endTime: '10:48 AM',
    duration: '3:24',
    type: 'booking',
    status: 'success',
    summary: 'Booked appointment for Nov 15 with Dr. Williams',
    messages: [
      { id: '1-1', sender: 'ai', content: 'Hello! Welcome to City Medical Center. I\'m Aiva, your AI virtual assistant. How may I help you today?', timestamp: '10:45:12 AM' },
      { id: '1-2', sender: 'patient', content: 'Hi, I need to book an appointment with Dr. Williams', timestamp: '10:45:28 AM' },
      { id: '1-3', sender: 'ai', content: 'I\'d be happy to help you schedule an appointment with Dr. Williams. May I have your full name and date of birth?', timestamp: '10:45:35 AM' },
      { id: '1-4', sender: 'patient', content: 'John Smith, born March 15, 1985', timestamp: '10:45:52 AM' },
      { id: '1-5', sender: 'ai', content: 'Thank you, Mr. Smith. Dr. Williams has availability on November 15th at 9:00 AM, 2:00 PM, or November 16th at 10:30 AM. Which time works best for you?', timestamp: '10:46:08 AM' },
      { id: '1-6', sender: 'patient', content: 'November 15th at 2:00 PM would be perfect', timestamp: '10:46:25 AM' },
      { id: '1-7', sender: 'ai', content: 'Excellent! I\'ve scheduled your appointment with Dr. Williams for November 15th at 2:00 PM. You\'ll receive a confirmation via SMS shortly. Is there anything else I can help you with?', timestamp: '10:46:42 AM' },
      { id: '1-8', sender: 'patient', content: 'No, that\'s all. Thank you!', timestamp: '10:47:18 AM' },
      { id: '1-9', sender: 'ai', content: 'You\'re welcome, Mr. Smith! We look forward to seeing you on November 15th. Have a great day!', timestamp: '10:47:28 AM' },
    ],
  },
  {
    id: '2',
    patient: 'Sarah Johnson',
    patientPhone: '555-0102',
    startTime: '10:30 AM',
    endTime: '10:32 AM',
    duration: '2:15',
    type: 'inquiry',
    status: 'success',
    summary: 'Provided clinic hours and location information',
    messages: [
      { id: '2-1', sender: 'ai', content: 'Good morning! This is Aiva from City Medical Center. How can I assist you today?', timestamp: '10:30:05 AM' },
      { id: '2-2', sender: 'patient', content: 'Hi, what are your clinic hours?', timestamp: '10:30:18 AM' },
      { id: '2-3', sender: 'ai', content: 'Our clinic is open Monday through Friday from 8:00 AM to 6:00 PM, and Saturday from 9:00 AM to 2:00 PM. We\'re closed on Sundays. Would you like our address as well?', timestamp: '10:30:32 AM' },
      { id: '2-4', sender: 'patient', content: 'Yes please, and do you take walk-ins?', timestamp: '10:30:58 AM' },
      { id: '2-5', sender: 'ai', content: 'We\'re located at 123 Healthcare Boulevard, Suite 200. We do accept walk-ins, but appointments are recommended to minimize wait times. Would you like to schedule an appointment?', timestamp: '10:31:15 AM' },
      { id: '2-6', sender: 'patient', content: 'Not right now, but thank you for the information', timestamp: '10:31:45 AM' },
      { id: '2-7', sender: 'ai', content: 'You\'re very welcome! Feel free to call back anytime you\'re ready to schedule. Have a wonderful day!', timestamp: '10:31:58 AM' },
    ],
  },
  {
    id: '3',
    patient: 'Michael Davis',
    patientPhone: '555-0103',
    startTime: '10:15 AM',
    endTime: '10:19 AM',
    duration: '4:10',
    type: 'reschedule',
    status: 'success',
    summary: 'Rescheduled appointment from Nov 10 to Nov 12',
    messages: [
      { id: '3-1', sender: 'ai', content: 'Hello! Welcome to City Medical Center. I\'m Aiva. How may I help you?', timestamp: '10:15:08 AM' },
      { id: '3-2', sender: 'patient', content: 'I need to reschedule my appointment', timestamp: '10:15:22 AM' },
      { id: '3-3', sender: 'ai', content: 'I can help you with that. May I have your name and date of birth to look up your appointment?', timestamp: '10:15:35 AM' },
      { id: '3-4', sender: 'patient', content: 'Michael Davis, June 22, 1978', timestamp: '10:15:58 AM' },
      { id: '3-5', sender: 'ai', content: 'Thank you, Mr. Davis. I see you have an appointment with Dr. Brown on November 10th at 3:00 PM. What date would work better for you?', timestamp: '10:16:18 AM' },
      { id: '3-6', sender: 'patient', content: 'Can I get it moved to November 12th?', timestamp: '10:16:42 AM' },
      { id: '3-7', sender: 'ai', content: 'Let me check Dr. Brown\'s availability... Yes, Dr. Brown is available on November 12th at 10:00 AM or 4:30 PM. Which time works for you?', timestamp: '10:17:05 AM' },
      { id: '3-8', sender: 'patient', content: '10:00 AM would be great', timestamp: '10:17:28 AM' },
      { id: '3-9', sender: 'ai', content: 'Perfect! I\'ve rescheduled your appointment to November 12th at 10:00 AM with Dr. Brown. You\'ll receive a confirmation shortly. Is there anything else I can help you with today?', timestamp: '10:17:48 AM' },
      { id: '3-10', sender: 'patient', content: 'That\'s all, thanks!', timestamp: '10:18:35 AM' },
      { id: '3-11', sender: 'ai', content: 'You\'re welcome! See you on November 12th. Have a great day!', timestamp: '10:18:52 AM' },
    ],
  },
];

export const mockAppointments: Appointment[] = [
  { id: '1', patient: 'John Smith', patientPhone: '555-0101', time: '09:00 AM', doctor: 'Dr. Williams', type: 'General Checkup', status: 'confirmed' },
  { id: '2', patient: 'Sarah Johnson', patientPhone: '555-0102', time: '10:30 AM', doctor: 'Dr. Brown', type: 'Follow-up', status: 'pending' },
  { id: '3', patient: 'Michael Davis', patientPhone: '555-0103', time: '02:00 PM', doctor: 'Dr. Williams', type: 'Consultation', status: 'confirmed' },
  { id: '4', patient: 'Emily Wilson', patientPhone: '555-0104', time: '03:30 PM', doctor: 'Dr. Martinez', type: 'General Checkup', status: 'completed' },
  { id: '5', patient: 'David Brown', patientPhone: '555-0105', time: '11:00 AM', doctor: 'Dr. Brown', type: 'Lab Results', status: 'confirmed' },
  { id: '6', patient: 'Lisa Anderson', patientPhone: '555-0106', time: '01:00 PM', doctor: 'Dr. Martinez', type: 'Consultation', status: 'pending' },
  { id: '7', patient: 'James Wilson', patientPhone: '555-0107', time: '04:00 PM', doctor: 'Dr. Williams', type: 'Follow-up', status: 'confirmed' },
  { id: '8', patient: 'Maria Garcia', patientPhone: '555-0108', time: '09:30 AM', doctor: 'Dr. Brown', type: 'General Checkup', status: 'cancelled' },
];

export const mockPatients: Patient[] = [
  {
    id: '1',
    name: 'John Smith',
    age: 38,
    gender: 'Male',
    phone: '555-0101',
    lastVisit: 'Oct 15, 2024',
    upcomingAppointment: 'Nov 15, 2024 at 2:00 PM',
    medicalHistory: ['Hypertension', 'Regular checkups'],
  },
  {
    id: '2',
    name: 'Sarah Johnson',
    age: 45,
    gender: 'Female',
    phone: '555-0102',
    lastVisit: 'Oct 22, 2024',
    upcomingAppointment: 'Nov 10, 2024 at 10:30 AM',
    medicalHistory: ['Diabetes Type 2', 'Annual physicals'],
  },
  {
    id: '3',
    name: 'Michael Davis',
    age: 52,
    gender: 'Male',
    phone: '555-0103',
    lastVisit: 'Sep 30, 2024',
    upcomingAppointment: 'Nov 12, 2024 at 10:00 AM',
    medicalHistory: ['High cholesterol', 'Heart condition monitoring'],
  },
  {
    id: '4',
    name: 'Emily Wilson',
    age: 29,
    gender: 'Female',
    phone: '555-0104',
    lastVisit: 'Nov 5, 2024',
    medicalHistory: ['Allergies', 'Preventive care'],
  },
  {
    id: '5',
    name: 'David Brown',
    age: 67,
    gender: 'Male',
    phone: '555-0105',
    lastVisit: 'Oct 28, 2024',
    upcomingAppointment: 'Nov 8, 2024 at 11:00 AM',
    medicalHistory: ['Arthritis', 'Regular medication review'],
  },
];

export const mockNotifications: Notification[] = [
  {
    id: '1',
    patient: 'John Smith',
    phone: '555-0101',
    type: 'SMS',
    message: 'Reminder: Your appointment with Dr. Williams is tomorrow at 9:00 AM',
    status: 'delivered',
    sentAt: 'Nov 7, 08:00 AM',
    scheduledFor: 'Nov 8, 09:00 AM',
  },
  {
    id: '2',
    patient: 'Sarah Johnson',
    phone: '555-0102',
    type: 'Email',
    message: 'Your appointment has been confirmed for Nov 12 at 10:30 AM',
    status: 'delivered',
    sentAt: 'Nov 7, 10:15 AM',
    scheduledFor: 'Nov 12, 10:30 AM',
  },
  {
    id: '3',
    patient: 'Michael Davis',
    phone: '555-0103',
    type: 'SMS',
    message: 'Appointment rescheduled to Nov 12 at 10:00 AM. Please confirm.',
    status: 'failed',
    sentAt: 'Nov 7, 11:30 AM',
    scheduledFor: 'Nov 12, 10:00 AM',
  },
  {
    id: '4',
    patient: 'Emily Wilson',
    phone: '555-0104',
    type: 'SMS',
    message: 'Reminder: Your appointment is in 2 hours',
    status: 'scheduled',
    sentAt: null,
    scheduledFor: 'Nov 8, 07:30 AM',
  },
];

export const mockStats = {
  todayAppointments: 24,
  pendingApprovals: 7,
  cancellations: 3,
  patientSatisfaction: 4.6,
  chatsHandledToday: 47,
  bookingsMade: 32,
  successRate: 94,
  averageChatDuration: '3:15',
};