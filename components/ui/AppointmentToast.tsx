import { Calendar, Check } from 'lucide-react';

interface AppointmentToastProps {
  patientName: string;
  time: string;
  doctor: string;
}

export function AppointmentToast({ patientName, time, doctor }: AppointmentToastProps) {
  return (
    <div className="min-w-[320px] rounded-xl border border-success bg-card p-4 shadow-lg">
      <div className="flex items-start gap-3">
        <div className="flex size-10 flex-shrink-0 items-center justify-center rounded-full bg-success">
          <Check className="size-5 text-success-foreground" />
        </div>
        <div className="flex-1">
          <div className="mb-1 flex items-center gap-2">
            <Calendar className="size-4 text-success" />
            <h4 className="font-medium text-foreground">New appointment booked</h4>
          </div>
          <p className="text-sm text-muted-foreground">
            {patientName} • {time}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">with {doctor}</p>
        </div>
      </div>
    </div>
  );
}
