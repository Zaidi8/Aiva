import { Calendar, Check } from 'lucide-react';
import { motion } from 'motion/react';

interface AppointmentToastProps {
  patientName: string;
  time: string;
  doctor: string;
}

export function AppointmentToast({ patientName, time, doctor }: AppointmentToastProps) {
  return (
    <motion.div
      initial={{ x: 400, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 400, opacity: 0 }}
      className="bg-white rounded-xl shadow-2xl border-2 border-[#27AE60] p-4 min-w-[320px]"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-[#27AE60] flex items-center justify-center flex-shrink-0">
          <Check className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="w-4 h-4 text-[#27AE60]" />
            <h4 className="font-medium text-[#333333]">New Appointment Booked</h4>
          </div>
          <p className="text-sm text-gray-600">
            {patientName} • {time}
          </p>
          <p className="text-xs text-gray-500 mt-1">with {doctor}</p>
        </div>
      </div>
    </motion.div>
  );
}
