"use client";
import {
  useState,
  useRef,
  useEffect,
  type ReactElement,
} from "react";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";

interface DateRange {
  start: string | null; // YYYY-MM-DD format
  end: string | null; // YYYY-MM-DD format
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  placeholder?: string;
  disabled?: boolean;
}

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export default function DateRangePicker({
  value,
  onChange,
  placeholder = "Select dates",
  disabled = false,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectingStart, setSelectingStart] = useState(true);
  const [tempStart, setTempStart] = useState<string | null>(
    value.start,
  );
  const [tempEnd, setTempEnd] = useState<string | null>(
    value.end,
  );
  const [dropdownPosition, setDropdownPosition] = useState<'left' | 'right'>('left');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Sync temp values with props
  useEffect(() => {
    setTempStart(value.start);
    setTempEnd(value.end);
  }, [value.start, value.end]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener(
        "mousedown",
        handleClickOutside,
      );
    }

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside,
      );
    };
  }, [isOpen]);

  // Adjust dropdown position based on button position
  useEffect(() => {
    const currentRef = buttonRef.current;
    if (currentRef) {
      const rect = currentRef.getBoundingClientRect();
      const windowWidth = window.innerWidth;
      if (rect.right + 300 > windowWidth) {
        setDropdownPosition('right');
      } else {
        setDropdownPosition('left');
      }
    }
  }, [isOpen]);

  const formatDateForDisplay = (
    dateStr: string | null,
  ): string => {
    if (!dateStr) return "";
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const getDisplayText = (): string => {
    if (tempStart && tempEnd) {
      return `${formatDateForDisplay(tempStart)} - ${formatDateForDisplay(tempEnd)}`;
    }
    if (tempStart) {
      return `${formatDateForDisplay(tempStart)} - ...`;
    }
    return placeholder;
  };

  const hasSelection = tempStart || tempEnd;

  const getDaysInMonth = (date: Date): number => {
    return new Date(
      date.getFullYear(),
      date.getMonth() + 1,
      0,
    ).getDate();
  };

  const getFirstDayOfMonth = (date: Date): number => {
    return new Date(
      date.getFullYear(),
      date.getMonth(),
      1,
    ).getDay();
  };

  const formatDate = (
    year: number,
    month: number,
    day: number,
  ): string => {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  };

  const isDateInRange = (dateStr: string): boolean => {
    if (!tempStart || !tempEnd) return false;
    return dateStr >= tempStart && dateStr <= tempEnd;
  };

  const isDateSelected = (dateStr: string): boolean => {
    return dateStr === tempStart || dateStr === tempEnd;
  };

  const isDateDisabled = (dateStr: string): boolean => {
    const today = new Date();
    const todayStr = formatDate(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );
    return dateStr > todayStr;
  };

  const handleDateClick = (dateStr: string) => {
    if (isDateDisabled(dateStr)) return;

    if (selectingStart) {
      setTempStart(dateStr);
      setTempEnd(null);
      setSelectingStart(false);
    } else {
      if (dateStr < tempStart!) {
        // If end date is before start, swap them
        setTempEnd(tempStart);
        setTempStart(dateStr);
      } else {
        setTempEnd(dateStr);
      }
      setSelectingStart(true);
    }
  };

  const handleApply = () => {
    if (tempStart && tempEnd) {
      onChange({ start: tempStart, end: tempEnd });
      setIsOpen(false);
    }
  };

  const handleClear = () => {
    setTempStart(null);
    setTempEnd(null);
    onChange({ start: null, end: null });
    setSelectingStart(true);
  };

  const handleQuickSelect = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);

    const startStr = formatDate(
      start.getFullYear(),
      start.getMonth(),
      start.getDate(),
    );
    const endStr = formatDate(
      end.getFullYear(),
      end.getMonth(),
      end.getDate(),
    );

    setTempStart(startStr);
    setTempEnd(endStr);
  };

  const handleToday = () => {
    const today = new Date();
    const todayStr = formatDate(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );
    setTempStart(todayStr);
    setTempEnd(todayStr);
  };

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentMonth((prev) => {
      const newDate = new Date(prev);
      if (direction === "prev") {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const days: ReactElement[] = [];

    // Empty cells for days before first day of month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="w-8 h-8" />);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = formatDate(year, month, day);
      const isSelected = isDateSelected(dateStr);
      const isInRange = isDateInRange(dateStr);
      const isDisabled = isDateDisabled(dateStr);

      days.push(
        <button
          key={day}
          onClick={() => handleDateClick(dateStr)}
          disabled={isDisabled}
          className={`
            w-8 h-8 rounded text-[12px] font-medium transition-all duration-150
            ${
              isDisabled
                ? "text-muted-foreground/40 cursor-not-allowed"
                : isSelected
                  ? "bg-primary text-primary-foreground"
                  : isInRange
                    ? "bg-primary-muted text-primary-muted-foreground"
                    : "text-foreground hover:bg-muted"
            }
          `}
        >
          {day}
        </button>,
      );
    }

    return days;
  };

  return (
    <div ref={dropdownRef} className="relative shrink-0">
      {/* Trigger Button */}
      <button
        ref={buttonRef}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          h-10 flex items-center justify-between px-3 bg-card border rounded-md text-sm font-medium transition-all duration-150
          ${
            disabled
              ? "opacity-50 cursor-not-allowed border-input"
              : isOpen
                ? "border-ring"
                : "border-input hover:border-muted-foreground/50"
          }
          ${hasSelection ? "text-foreground" : "text-muted-foreground"}
        `}
        style={{ minWidth: "160px" }}
      >
        <span className="flex items-center gap-2 truncate">
          <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span className="truncate">{getDisplayText()}</span>
        </span>
        {hasSelection && (
          <X
            className="w-3.5 h-3.5 text-muted-foreground shrink-0 hover:text-foreground ml-1"
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
          />
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute left-0 mt-1 bg-popover border border-border rounded-lg shadow-md z-50 overflow-hidden"
          style={{
            width: "300px",
            left: dropdownPosition === 'right' ? 'auto' : '0',
            right: dropdownPosition === 'right' ? '0' : 'auto',
          }}
        >
          {/* Quick Select Buttons */}
          <div className="flex gap-1.5 p-3 border-b border-border">
            <button
              onClick={handleToday}
              className="px-2.5 py-1.5 bg-muted hover:bg-secondary text-[11px] font-medium text-muted-foreground hover:text-foreground rounded transition-colors"
            >
              Today
            </button>
            <button
              onClick={() => handleQuickSelect(7)}
              className="px-2.5 py-1.5 bg-muted hover:bg-secondary text-[11px] font-medium text-muted-foreground hover:text-foreground rounded transition-colors"
            >
              Last 7 days
            </button>
            <button
              onClick={() => handleQuickSelect(30)}
              className="px-2.5 py-1.5 bg-muted hover:bg-secondary text-[11px] font-medium text-muted-foreground hover:text-foreground rounded transition-colors"
            >
              Last 30 days
            </button>
            <button
              onClick={() => handleQuickSelect(90)}
              className="px-2.5 py-1.5 bg-muted hover:bg-secondary text-[11px] font-medium text-muted-foreground hover:text-foreground rounded transition-colors"
            >
              Last 90 days
            </button>
          </div>

          {/* Month Navigation */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-border">
            <button
              onClick={() => navigateMonth("prev")}
              className="p-1 hover:bg-muted rounded transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-muted-foreground" />
            </button>
            <span className="text-[13px] font-semibold text-foreground">
              {MONTHS[currentMonth.getMonth()]}{" "}
              {currentMonth.getFullYear()}
            </span>
            <button
              onClick={() => navigateMonth("next")}
              className="p-1 hover:bg-muted rounded transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Calendar Grid */}
          <div className="p-3">
            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {DAYS.map((day) => (
                <div
                  key={day}
                  className="w-8 h-6 flex items-center justify-center text-[10px] font-semibold text-muted-foreground uppercase"
                >
                  {day}
                </div>
              ))}
            </div>
            {/* Days */}
            <div className="grid grid-cols-7 gap-1">
              {renderCalendar()}
            </div>
          </div>

          {/* Selection Info & Apply Button */}
          <div className="flex items-center justify-between px-3 py-2.5 border-t border-border bg-muted">
            <div className="text-[11px] text-muted-foreground">
              {selectingStart
                ? "Select start date"
                : "Select end date"}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleClear}
                className="px-3 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear
              </button>
              <button
                onClick={handleApply}
                disabled={!tempStart || !tempEnd}
                className={`
                  px-3 py-1.5 text-[11px] font-semibold rounded transition-all
                  ${
                    tempStart && tempEnd
                      ? "bg-primary text-primary-foreground hover:bg-primary-hover"
                      : "bg-border text-muted-foreground cursor-not-allowed"
                  }
                `}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
