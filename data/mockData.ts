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

// Legacy type aliases
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
  {
    id: '4',
    patient: 'Emily Carter',
    patientPhone: '555-0104',
    startTime: '9:50 AM',
    endTime: '9:53 AM',
    duration: '2:45',
    type: 'booking',
    status: 'success',
    summary: 'Booked annual physical exam with Dr. Martinez for Nov 20',
    sentiment: 'positive',
    callQuality: 5,
    transcript: [
      { id: '4-1', speaker: 'ai', text: 'Hello! Welcome to City Medical Center. I\'m Aiva, your AI virtual assistant. How may I help you today?', timestamp: '00:00', duration: '0:06' },
      { id: '4-2', speaker: 'patient', text: 'Hi, I\'d like to schedule an annual physical exam please', timestamp: '00:12', duration: '0:04' },
      { id: '4-3', speaker: 'ai', text: 'Of course! I can help you with that. May I have your full name and date of birth?', timestamp: '00:20', duration: '0:06' },
      { id: '4-4', speaker: 'patient', text: 'Emily Carter, September 3, 1990', timestamp: '00:32', duration: '0:03' },
      { id: '4-5', speaker: 'ai', text: 'Thank you, Ms. Carter. Dr. Martinez has availability for a physical exam on November 20th at 8:30 AM or November 22nd at 1:00 PM. Which would you prefer?', timestamp: '00:45', duration: '0:12' },
      { id: '4-6', speaker: 'patient', text: 'November 20th at 8:30 AM works great', timestamp: '01:05', duration: '0:03' },
      { id: '4-7', speaker: 'ai', text: 'Wonderful! Your annual physical exam is booked with Dr. Martinez for November 20th at 8:30 AM. Please remember to fast for 12 hours before your visit for blood work. A confirmation text will be sent shortly.', timestamp: '01:18', duration: '0:18' },
      { id: '4-8', speaker: 'patient', text: 'Thank you so much!', timestamp: '01:50', duration: '0:02' },
      { id: '4-9', speaker: 'ai', text: 'You\'re welcome! See you on November 20th. Have a great day!', timestamp: '02:00', duration: '0:06' },
    ],
  },
  {
    id: '5',
    patient: 'Robert Chen',
    patientPhone: '555-0105',
    startTime: '9:30 AM',
    endTime: '9:34 AM',
    duration: '3:50',
    type: 'cancellation',
    status: 'failed',
    summary: 'Patient requested cancellation of Nov 14 appointment, offered reschedule options',
    sentiment: 'neutral',
    callQuality: 4,
    transcript: [
      { id: '5-1', speaker: 'ai', text: 'Good morning! This is Aiva from City Medical Center. How can I assist you?', timestamp: '00:00', duration: '0:05' },
      { id: '5-2', speaker: 'patient', text: 'Hi, I need to cancel my appointment on November 14th', timestamp: '00:10', duration: '0:04' },
      { id: '5-3', speaker: 'ai', text: 'I can help with that. May I have your name and date of birth?', timestamp: '00:20', duration: '0:05' },
      { id: '5-4', speaker: 'patient', text: 'Robert Chen, January 11, 1972', timestamp: '00:32', duration: '0:03' },
      { id: '5-5', speaker: 'ai', text: 'Thank you, Mr. Chen. I see your appointment with Dr. Williams on November 14th at 11:00 AM. Before I cancel, would you like to reschedule to a different date instead?', timestamp: '00:48', duration: '0:14' },
      { id: '5-6', speaker: 'patient', text: 'No, I\'ll call back when I\'m ready to reschedule. Just cancel for now please.', timestamp: '01:15', duration: '0:05' },
      { id: '5-7', speaker: 'ai', text: 'Understood. Your appointment on November 14th has been cancelled. You\'ll receive a confirmation email shortly. Feel free to call back anytime to reschedule.', timestamp: '01:35', duration: '0:12' },
      { id: '5-8', speaker: 'patient', text: 'Thanks, bye', timestamp: '02:00', duration: '0:02' },
      { id: '5-9', speaker: 'ai', text: 'Take care, Mr. Chen. We hope to see you soon!', timestamp: '02:10', duration: '0:05' },
    ],
  },
  {
    id: '6',
    patient: 'Angela Torres',
    patientPhone: '555-0106',
    startTime: '9:05 AM',
    endTime: '9:08 AM',
    duration: '2:55',
    type: 'inquiry',
    status: 'success',
    summary: 'Provided insurance and billing information',
    sentiment: 'positive',
    callQuality: 4,
    transcript: [
      { id: '6-1', speaker: 'ai', text: 'Hello! Welcome to City Medical Center. I\'m Aiva. How may I help you today?', timestamp: '00:00', duration: '0:05' },
      { id: '6-2', speaker: 'patient', text: 'Hi, I wanted to know what insurance plans you accept', timestamp: '00:10', duration: '0:03' },
      { id: '6-3', speaker: 'ai', text: 'We accept most major insurance plans including Blue Cross Blue Shield, Aetna, Cigna, UnitedHealthcare, and Medicare. Do you have a specific plan you\'d like me to verify?', timestamp: '00:22', duration: '0:14' },
      { id: '6-4', speaker: 'patient', text: 'I have Aetna PPO. And what about copay?', timestamp: '00:45', duration: '0:04' },
      { id: '6-5', speaker: 'ai', text: 'Yes, Aetna PPO is accepted here. Copay amounts depend on your specific plan, but typically range from $20-$40 for a standard office visit. I recommend checking with Aetna directly for your exact copay. Would you like to schedule a visit?', timestamp: '01:05', duration: '0:18' },
      { id: '6-6', speaker: 'patient', text: 'Not yet, but that\'s very helpful. Thank you!', timestamp: '01:40', duration: '0:03' },
      { id: '6-7', speaker: 'ai', text: 'Happy to help, Ms. Torres! Don\'t hesitate to call back when you\'re ready. Have a wonderful day!', timestamp: '01:55', duration: '0:07' },
    ],
  },
  {
    id: '7',
    patient: 'David Patel',
    patientPhone: '555-0107',
    startTime: '8:40 AM',
    endTime: '8:44 AM',
    duration: '3:35',
    type: 'booking',
    status: 'success',
    summary: 'Booked urgent consultation with Dr. Brown for Nov 11',
    sentiment: 'neutral',
    callQuality: 5,
    transcript: [
      { id: '7-1', speaker: 'ai', text: 'Good morning! This is Aiva from City Medical Center. How can I assist you?', timestamp: '00:00', duration: '0:05' },
      { id: '7-2', speaker: 'patient', text: 'I need to see a doctor as soon as possible. I\'ve been having persistent headaches.', timestamp: '00:12', duration: '0:05' },
      { id: '7-3', speaker: 'ai', text: 'I\'m sorry to hear that, and I\'ll help you get an appointment quickly. May I have your name and date of birth?', timestamp: '00:25', duration: '0:08' },
      { id: '7-4', speaker: 'patient', text: 'David Patel, April 8, 1988', timestamp: '00:40', duration: '0:03' },
      { id: '7-5', speaker: 'ai', text: 'Thank you, Mr. Patel. The earliest available consultation is with Dr. Brown tomorrow, November 11th, at 9:15 AM. Would that work for you?', timestamp: '00:55', duration: '0:12' },
      { id: '7-6', speaker: 'patient', text: 'Yes, that\'s perfect. Thank you for fitting me in quickly.', timestamp: '01:20', duration: '0:04' },
      { id: '7-7', speaker: 'ai', text: 'Of course! Your consultation with Dr. Brown is confirmed for November 11th at 9:15 AM. If your headaches worsen or you experience vision changes before then, please visit the nearest emergency room. A confirmation will be sent to you shortly.', timestamp: '01:40', duration: '0:20' },
      { id: '7-8', speaker: 'patient', text: 'Got it, thanks a lot', timestamp: '02:15', duration: '0:02' },
      { id: '7-9', speaker: 'ai', text: 'Take care, Mr. Patel. We\'ll see you tomorrow!', timestamp: '02:25', duration: '0:05' },
    ],
  },
  {
    id: '8',
    patient: 'Linda Nguyen',
    patientPhone: '555-0108',
    startTime: '8:15 AM',
    endTime: '8:18 AM',
    duration: '2:30',
    type: 'reschedule',
    status: 'success',
    summary: 'Rescheduled follow-up from Nov 13 to Nov 18 with Dr. Williams',
    sentiment: 'positive',
    callQuality: 4,
    transcript: [
      { id: '8-1', speaker: 'ai', text: 'Hello! Welcome to City Medical Center. I\'m Aiva. How may I help you?', timestamp: '00:00', duration: '0:05' },
      { id: '8-2', speaker: 'patient', text: 'I need to move my follow-up appointment to a later date', timestamp: '00:12', duration: '0:04' },
      { id: '8-3', speaker: 'ai', text: 'Sure, I can help with that. May I have your name please?', timestamp: '00:22', duration: '0:04' },
      { id: '8-4', speaker: 'patient', text: 'Linda Nguyen', timestamp: '00:32', duration: '0:02' },
      { id: '8-5', speaker: 'ai', text: 'Thank you, Ms. Nguyen. I see your follow-up with Dr. Williams on November 13th at 2:30 PM. When would you prefer to reschedule?', timestamp: '00:44', duration: '0:10' },
      { id: '8-6', speaker: 'patient', text: 'Sometime the week of November 18th if possible', timestamp: '01:02', duration: '0:03' },
      { id: '8-7', speaker: 'ai', text: 'Dr. Williams is available on November 18th at 11:00 AM or November 19th at 3:00 PM. Which would work better?', timestamp: '01:15', duration: '0:10' },
      { id: '8-8', speaker: 'patient', text: 'November 18th at 11 AM please', timestamp: '01:32', duration: '0:03' },
      { id: '8-9', speaker: 'ai', text: 'Done! Your follow-up has been rescheduled to November 18th at 11:00 AM with Dr. Williams. You\'ll get a confirmation shortly. Have a great day!', timestamp: '01:45', duration: '0:12' },
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

// mockPatients removed in Phase 2 — patients now load from the live API
// (see app/(dashboard)/patients/page.tsx -> listPatients). The Patient type
// export remains for other modules that still reference it.

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