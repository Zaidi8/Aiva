// Comprehensive Mock Data for Smart AI Receptionist System

export interface CallTranscriptSegment {
  id: string;
  speaker: 'patient' | 'ai';
  text: string;
  timestamp: string;
  duration: string;
}

export interface CallRecording {
  id: string;
  patient: string;
  patientPhone: string;
  startTime: string;
  endTime: string;
  duration: string;
  type: 'booking' | 'inquiry' | 'reschedule' | 'cancellation';
  status: 'success' | 'transferred' | 'failed';
  summary: string;
  transcript: CallTranscriptSegment[];
  sentiment: 'positive' | 'neutral' | 'negative';
  callQuality: number; // 1-5 rating
}

// Legacy support for backwards compatibility
export type Message = CallTranscriptSegment;
export type Conversation = CallRecording;

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

export const mockCalls: CallRecording[] = [
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
    sentiment: 'positive',
    callQuality: 5,
    transcript: [
      { id: '1-1', speaker: 'ai', text: 'Hello! Welcome to City Medical Center. I\'m Aiva, your AI virtual assistant. How may I help you today?', timestamp: '00:00', duration: '0:06' },
      { id: '1-2', speaker: 'patient', text: 'Hi, I need to book an appointment with Dr. Williams', timestamp: '00:16', duration: '0:04' },
      { id: '1-3', speaker: 'ai', text: 'I\'d be happy to help you schedule an appointment with Dr. Williams. May I have your full name and date of birth?', timestamp: '00:23', duration: '0:08' },
      { id: '1-4', speaker: 'patient', text: 'John Smith, born March 15, 1985', timestamp: '00:40', duration: '0:03' },
      { id: '1-5', speaker: 'ai', text: 'Thank you, Mr. Smith. Dr. Williams has availability on November 15th at 9:00 AM, 2:00 PM, or November 16th at 10:30 AM. Which time works best for you?', timestamp: '00:56', duration: '0:14' },
      { id: '1-6', speaker: 'patient', text: 'November 15th at 2:00 PM would be perfect', timestamp: '01:13', duration: '0:04' },
      { id: '1-7', speaker: 'ai', text: 'Excellent! I\'ve scheduled your appointment with Dr. Williams for November 15th at 2:00 PM. You\'ll receive a confirmation via SMS shortly. Is there anything else I can help you with?', timestamp: '01:30', duration: '0:15' },
      { id: '1-8', speaker: 'patient', text: 'No, that\'s all. Thank you!', timestamp: '02:06', duration: '0:02' },
      { id: '1-9', speaker: 'ai', text: 'You\'re welcome, Mr. Smith! We look forward to seeing you on November 15th. Have a great day!', timestamp: '02:16', duration: '0:07' },
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
    sentiment: 'positive',
    callQuality: 4,
    transcript: [
      { id: '2-1', speaker: 'ai', text: 'Good morning! This is Aiva from City Medical Center. How can I assist you today?', timestamp: '00:00', duration: '0:05' },
      { id: '2-2', speaker: 'patient', text: 'Hi, what are your clinic hours?', timestamp: '00:13', duration: '0:02' },
      { id: '2-3', speaker: 'ai', text: 'Our clinic is open Monday through Friday from 8:00 AM to 6:00 PM, and Saturday from 9:00 AM to 2:00 PM. We\'re closed on Sundays. Would you like our address as well?', timestamp: '00:27', duration: '0:14' },
      { id: '2-4', speaker: 'patient', text: 'Yes please, and do you take walk-ins?', timestamp: '00:53', duration: '0:03' },
      { id: '2-5', speaker: 'ai', text: 'We\'re located at 123 Healthcare Boulevard, Suite 200. We do accept walk-ins, but appointments are recommended to minimize wait times. Would you like to schedule an appointment?', timestamp: '01:10', duration: '0:16' },
      { id: '2-6', speaker: 'patient', text: 'Not right now, but thank you for the information', timestamp: '01:40', duration: '0:03' },
      { id: '2-7', speaker: 'ai', text: 'You\'re very welcome! Feel free to call back anytime you\'re ready to schedule. Have a wonderful day!', timestamp: '01:53', duration: '0:07' },
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
    sentiment: 'neutral',
    callQuality: 5,
    transcript: [
      { id: '3-1', speaker: 'ai', text: 'Hello! Welcome to City Medical Center. I\'m Aiva. How may I help you?', timestamp: '00:00', duration: '0:05' },
      { id: '3-2', speaker: 'patient', text: 'I need to reschedule my appointment', timestamp: '00:14', duration: '0:02' },
      { id: '3-3', speaker: 'ai', text: 'I can help you with that. May I have your name and date of birth to look up your appointment?', timestamp: '00:27', duration: '0:08' },
      { id: '3-4', speaker: 'patient', text: 'Michael Davis, June 22, 1978', timestamp: '00:50', duration: '0:03' },
      { id: '3-5', speaker: 'ai', text: 'Thank you, Mr. Davis. I see you have an appointment with Dr. Brown on November 10th at 3:00 PM. What date would work better for you?', timestamp: '01:10', duration: '0:12' },
      { id: '3-6', speaker: 'patient', text: 'Can I get it moved to November 12th?', timestamp: '01:34', duration: '0:03' },
      { id: '3-7', speaker: 'ai', text: 'Let me check Dr. Brown\'s availability... Yes, Dr. Brown is available on November 12th at 10:00 AM or 4:30 PM. Which time works for you?', timestamp: '01:57', duration: '0:14' },
      { id: '3-8', speaker: 'patient', text: '10:00 AM would be great', timestamp: '02:20', duration: '0:02' },
      { id: '3-9', speaker: 'ai', text: 'Perfect! I\'ve rescheduled your appointment to November 12th at 10:00 AM with Dr. Brown. You\'ll receive a confirmation shortly. Is there anything else I can help you with today?', timestamp: '02:40', duration: '0:16' },
      { id: '3-10', speaker: 'patient', text: 'That\'s all, thanks!', timestamp: '03:27', duration: '0:02' },
      { id: '3-11', speaker: 'ai', text: 'You\'re welcome! See you on November 12th. Have a great day!', timestamp: '03:37', duration: '0:05' },
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
  callsHandledToday: 47,
  bookingsMade: 32,
  successRate: 94,
  averageCallDuration: '3:15',
};

// Backward compatibility exports
export const mockConversations = mockCalls;