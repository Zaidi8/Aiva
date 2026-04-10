import { useState, useEffect } from 'react';
import {
  Bot,
  Phone,
  TrendingUp,
  CheckCircle,
  Search,
  X,
  PhoneCall,
  Clock,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Volume2,
  Star,
  Activity,
  User,
  Calendar,
  FileText,
  Download,
  ChevronRight,
  ArrowUpRight,
  Mic,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { ScrollArea } from '../ui/scroll-area';
import { TopBar } from '../ui/TopBar';
import { StatsBar } from '../ui/StatsBar';
import { DevControls } from '../ui/DevControls';
import { PaginationBar } from '../ui/PaginationBar';
import DateRangePicker from '../ui/date-range-picker';
import { motion, AnimatePresence } from 'motion/react';
import { mockCalls, mockNotifications } from '../../data/mockData';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';

interface NewAIReceptionistPageProps {
  onNavigate?: (page: string) => void;
}

interface DateRange {
  start: string | null;
  end: string | null;
}

// Shared height for both panels — keeps them equal and scrollable
const PANEL_HEIGHT = 520;

export function NewAIReceptionistPage({ onNavigate }: NewAIReceptionistPageProps) {
  const [showEmptyState, setShowEmptyState] = useState(false);
  const [selectedCall, setSelectedCall] = useState<string | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState<DateRange>({ start: null, end: null });
  const [currentPage, setCurrentPage] = useState(1);
  const [showLargeDataset, setShowLargeDataset] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [detailTab, setDetailTab] = useState<'transcript' | 'summary'>('transcript');

  const largeDataset = showLargeDataset
    ? Array.from({ length: 50 }, (_, i) => ({
        ...mockCalls[i % mockCalls.length],
        id: `${i + 1}`,
        patient: `${mockCalls[i % mockCalls.length].patient} ${i + 1}`,
      }))
    : mockCalls;

  const allCalls = showEmptyState ? [] : largeDataset;

  const filteredCalls = allCalls.filter((call) => {
    const matchesSearch =
      call.patient.toLowerCase().includes(searchQuery.toLowerCase()) ||
      call.patientPhone.includes(searchQuery);
    const matchesStatus = statusFilter === 'all' || call.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  useEffect(() => {
    if (filteredCalls.length > 0 && !selectedCall) {
      setSelectedCall(filteredCalls[0].id);
    }
  }, [filteredCalls, selectedCall]);

  const selectedCallData = allCalls.find((c) => c.id === selectedCall);

  const totalPages = Math.ceil(filteredCalls.length / itemsPerPage);
  const paginatedCalls = filteredCalls.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getCallTypeIcon = (type: string) => {
    const map: Record<string, typeof Phone> = {
      booking: Calendar,
      inquiry: PhoneIncoming,
      reschedule: PhoneOutgoing,
      cancellation: PhoneMissed,
    };
    return map[type] || Phone;
  };

  const getStatusStyle = (status: string) => {
    const map: Record<string, { label: string; className: string }> = {
      success: { label: 'Completed', className: 'bg-[#27AE60]/10 text-[#27AE60]' },
      failed: { label: 'Assisted', className: 'bg-[#F2994A]/10 text-[#F2994A]' },
      transferred: { label: 'Transferred', className: 'bg-[#2F80ED]/10 text-[#2F80ED]' },
    };
    return map[status] || map.success;
  };

  const getTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      booking: 'Booking',
      inquiry: 'Inquiry',
      reschedule: 'Reschedule',
      cancellation: 'Cancellation',
    };
    return map[type] || type;
  };

  const getSentimentStyle = (sentiment: string) => {
    const map: Record<string, { label: string; className: string }> = {
      positive: { label: 'Positive', className: 'bg-[#27AE60]/10 text-[#27AE60]' },
      neutral: { label: 'Neutral', className: 'bg-[#2F80ED]/10 text-[#2F80ED]' },
      negative: { label: 'Negative', className: 'bg-[#EB5757]/10 text-[#EB5757]' },
    };
    return map[sentiment] || map.neutral;
  };

  const stats = [
    { label: 'Calls Handled Today', value: 47, icon: PhoneCall, color: '#2F80ED', change: '+5' },
    { label: 'Successful Bookings', value: 32, icon: CheckCircle, color: '#27AE60' },
    { label: 'Success Rate', value: '94%', icon: TrendingUp, color: '#56CCF2' },
    { label: 'Avg. Call Duration', value: '3:15', icon: Clock, color: '#F2994A' },
  ];

  return (
    <div className="min-h-screen bg-[#F7F9FB]">
      <TopBar
        title="AI Receptionist"
        notificationCount={mockNotifications.length}
        onNotificationsClick={() => setShowNotifications(true)}
      />

      <div className="p-8 max-w-7xl mx-auto flex flex-col gap-6">
        <StatsBar stats={stats} />

        {/* Filters */}
        <motion.div
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex flex-col sm:flex-row gap-4"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Search by caller name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-44 h-12">
              <SelectValue placeholder="Filter by outcome" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Calls</SelectItem>
              <SelectItem value="success">Completed</SelectItem>
              <SelectItem value="failed">Assisted</SelectItem>
            </SelectContent>
          </Select>
          <DateRangePicker value={dateRange} onChange={setDateRange} />
        </motion.div>

        {/* Two-panel layout — equal height, both scrollable */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* ── Call List ── */}
            <div className="lg:col-span-2">
              <div
                className="bg-white rounded-xl border overflow-hidden hover:shadow-lg transition-shadow flex flex-col"
                style={{ height: PANEL_HEIGHT }}
              >
                {/* List header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
                  <h3 className="text-base font-semibold leading-none">Recent Calls</h3>
                  <span className="text-xs text-gray-500">{filteredCalls.length} total</span>
                </div>

                {/* Scrollable list body */}
                <div className="flex-1 overflow-hidden">
                  {filteredCalls.length === 0 ? (
                    <div className="h-full flex items-center justify-center p-12 text-center">
                      <div>
                        <Phone className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <h3 className="text-base text-gray-600 mb-1">
                          {showEmptyState ? 'No Calls Yet' : 'No Calls Found'}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {showEmptyState
                            ? 'Call records will appear here once the AI receptionist starts handling calls.'
                            : 'Try adjusting your search or filters.'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <ScrollArea className="h-full">
                      <div className="divide-y divide-gray-100">
                        {paginatedCalls.map((call, index) => {
                          const CallTypeIcon = getCallTypeIcon(call.type);
                          const statusStyle = getStatusStyle(call.status);
                          const isSelected = selectedCall === call.id;

                          return (
                            <motion.div
                              key={call.id}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: index * 0.03 }}
                              onClick={() => {
                                setSelectedCall(call.id);
                                setDetailTab('transcript');
                              }}
                              className={`relative px-6 py-4 cursor-pointer transition-colors ${
                                isSelected ? 'bg-[#2F80ED]/5' : 'hover:bg-gray-50'
                              }`}
                            >
                              {isSelected && (
                                <div className="absolute left-0 top-3 bottom-3 w-[3px] bg-[#2F80ED] rounded-r-full" />
                              )}
                              <div className="flex items-center gap-4">
                                <div
                                  className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${
                                    isSelected
                                      ? 'bg-gradient-to-br from-[#2F80ED] to-[#56CCF2] text-white shadow-sm'
                                      : 'bg-gray-100 text-gray-500'
                                  }`}
                                >
                                  <CallTypeIcon className="w-5 h-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between mb-1">
                                    <h3 className="text-sm font-medium text-[#333333] truncate pr-2">
                                      {call.patient}
                                    </h3>
                                    <Badge className={`text-[10px] px-2 py-0.5 border-none shrink-0 ${statusStyle.className}`}>
                                      {statusStyle.label}
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-gray-500 truncate mb-1.5">{call.summary}</p>
                                  <div className="flex items-center gap-3 text-[11px] text-gray-400">
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {call.duration}
                                    </span>
                                    <span>{call.startTime}</span>
                                    <span className="text-gray-300">|</span>
                                    <span>{getTypeLabel(call.type)}</span>
                                  </div>
                                </div>
                                {isSelected && (
                                  <ChevronRight className="w-4 h-4 text-[#2F80ED] shrink-0" />
                                )}
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  )}
                </div>
              </div>
            </div>

            {/* ── Call Detail Panel ── */}
            <div className="lg:col-span-3">
              <AnimatePresence mode="wait">
                {selectedCallData ? (
                  <motion.div
                    key={selectedCallData.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <div
                      className="bg-white rounded-xl border overflow-hidden hover:shadow-lg transition-shadow flex flex-col"
                      style={{ height: PANEL_HEIGHT }}
                    >
                      {/* Header */}
                      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-[#2F80ED] to-[#56CCF2] rounded-full flex items-center justify-center text-white text-sm shadow-sm">
                            {selectedCallData.patient.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <h3 className="text-base font-semibold leading-none">{selectedCallData.patient}</h3>
                            <p className="text-xs text-gray-500 mt-1.5">{selectedCallData.patientPhone}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge className={`text-xs ${getStatusStyle(selectedCallData.status).className}`}>
                            {getStatusStyle(selectedCallData.status).label}
                          </Badge>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedCall(null)}>
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Metadata */}
                      <div className="px-6 py-3 bg-[#F7F9FB] border-b border-gray-100 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-600 shrink-0">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-gray-400" />
                          <span>{selectedCallData.startTime} – {selectedCallData.endTime}</span>
                          <span className="text-gray-400">({selectedCallData.duration})</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5 text-gray-400" />
                          <span>{getTypeLabel(selectedCallData.type)}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className={`text-[11px] px-2 py-0 h-5 border-none ${getSentimentStyle(selectedCallData.sentiment).className}`}>
                            {getSentimentStyle(selectedCallData.sentiment).label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-0.5">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3.5 h-3.5 ${
                                i < selectedCallData.callQuality
                                  ? 'fill-amber-400 text-amber-400'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Tabs */}
                      <div className="border-b border-gray-100 bg-white shrink-0">
                        <div className="flex px-6 gap-1">
                          {[
                            { id: 'transcript' as const, label: 'Transcript' },
                            { id: 'summary' as const, label: 'Summary' },
                          ].map((tab) => (
                            <button
                              key={tab.id}
                              onClick={() => setDetailTab(tab.id)}
                              className={`relative px-4 py-3 text-sm transition-colors ${
                                detailTab === tab.id
                                  ? 'text-[#2F80ED] font-medium'
                                  : 'text-gray-500 hover:text-gray-700'
                              }`}
                            >
                              {tab.label}
                              {detailTab === tab.id && (
                                <motion.div
                                  layoutId="detailTab"
                                  className="absolute bottom-0 left-2 right-2 h-0.5 bg-[#2F80ED] rounded-full"
                                />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Scrollable content — takes all remaining space */}
                      <div className="flex-1 overflow-hidden">
                        <ScrollArea className="h-full">
                          {detailTab === 'transcript' ? (
                            <div className="p-6 flex flex-col gap-6">
                              {selectedCallData.transcript.map((segment, index) => {
                                const isAI = segment.speaker === 'ai';
                                return (
                                  <motion.div
                                    key={segment.id}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.025 }}
                                    className={`flex gap-3 ${isAI ? '' : 'flex-row-reverse'}`}
                                  >
                                    <div
                                      className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white ${
                                        isAI
                                          ? 'bg-gradient-to-br from-[#2F80ED] to-[#56CCF2]'
                                          : 'bg-gradient-to-br from-[#27AE60] to-[#56CCF2]'
                                      }`}
                                    >
                                      {isAI ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                                    </div>
                                    <div className="flex-1 max-w-[78%]">
                                      <div className={`flex items-center gap-2 mb-1 ${isAI ? '' : 'justify-end'}`}>
                                        <span className="text-xs font-medium text-gray-600">
                                          {isAI ? 'Aiva AI' : selectedCallData.patient}
                                        </span>
                                        <span className="text-[11px] text-gray-400">{segment.timestamp}</span>
                                      </div>
                                      <div
                                        className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                                          isAI
                                            ? 'bg-gray-100 text-gray-700 rounded-tl-sm'
                                            : 'bg-gradient-to-r from-[#2F80ED] to-[#56CCF2] text-white rounded-tr-sm'
                                        }`}
                                      >
                                        {segment.text}
                                      </div>
                                    </div>
                                  </motion.div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="p-6 flex flex-col gap-6">
                              <div className="p-4 bg-[#2F80ED]/5 rounded-xl border border-[#2F80ED]/10">
                                <div className="flex items-start gap-3">
                                  <div className="w-8 h-8 bg-gradient-to-br from-[#2F80ED] to-[#56CCF2] rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                                    <FileText className="w-4 h-4 text-white" />
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-[#2F80ED] mb-1">Call Outcome</p>
                                    <p className="text-sm text-gray-700 leading-relaxed">
                                      {selectedCallData.summary}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              <div>
                                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Call Details</h4>
                                <div className="grid grid-cols-2 gap-3">
                                  {[
                                    { label: 'Caller', value: selectedCallData.patient, icon: User },
                                    { label: 'Phone', value: selectedCallData.patientPhone, icon: Phone },
                                    { label: 'Duration', value: selectedCallData.duration, icon: Clock },
                                    { label: 'Type', value: getTypeLabel(selectedCallData.type), icon: Activity },
                                    { label: 'Start', value: selectedCallData.startTime, icon: ArrowUpRight },
                                    { label: 'Quality', value: `${selectedCallData.callQuality}/5`, icon: Star },
                                  ].map((item) => (
                                    <div key={item.label} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                      <item.icon className="w-4 h-4 text-gray-400 shrink-0" />
                                      <div>
                                        <p className="text-[11px] text-gray-400">{item.label}</p>
                                        <p className="text-sm text-[#333333] font-medium">{item.value}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <div>
                                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Conversation Flow</h4>
                                <div className="space-y-0">
                                  {selectedCallData.transcript.map((segment, i) => {
                                    const isAI = segment.speaker === 'ai';
                                    const isLast = i === selectedCallData.transcript.length - 1;
                                    return (
                                      <div key={segment.id} className="flex gap-3">
                                        <div className="flex flex-col items-center">
                                          <div
                                            className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1.5 ${
                                              isAI ? 'bg-[#2F80ED]' : 'bg-[#27AE60]'
                                            }`}
                                          />
                                          {!isLast && <div className="w-px flex-1 bg-gray-200 min-h-[16px]" />}
                                        </div>
                                        <div className="pb-3 flex-1 min-w-0">
                                          <div className="flex items-center gap-2">
                                            <span className="text-xs font-medium text-gray-600">
                                              {isAI ? 'Aiva AI' : selectedCallData.patient}
                                            </span>
                                            <span className="text-[11px] text-gray-400">{segment.timestamp}</span>
                                          </div>
                                          <p className="text-xs text-gray-500 leading-relaxed mt-0.5 line-clamp-2">{segment.text}</p>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          )}
                        </ScrollArea>
                      </div>

                      {/* Footer */}
                      <div className="border-t border-gray-100 px-6 py-3 bg-white flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-1.5 text-xs text-gray-400">
                          <Mic className="w-3.5 h-3.5" />
                          <span>Call recording available</span>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="text-xs h-8">
                            <Volume2 className="w-3.5 h-3.5 mr-1.5" />
                            Play
                          </Button>
                          <Button variant="outline" size="sm" className="text-xs h-8">
                            <Download className="w-3.5 h-3.5 mr-1.5" />
                            Export
                          </Button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <div
                      className="bg-white rounded-xl border flex items-center justify-center hover:shadow-lg transition-shadow"
                      style={{ height: PANEL_HEIGHT }}
                    >
                      <div className="text-center">
                        <div className="w-16 h-16 bg-gradient-to-br from-[#2F80ED]/10 to-[#56CCF2]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                          <PhoneCall className="w-8 h-8 text-[#2F80ED]/30" />
                        </div>
                        <h3 className="text-lg text-gray-600 mb-1">Select a Call</h3>
                        <p className="text-sm text-gray-400 max-w-[220px]">
                          Click on a call from the list to view the full details and transcript
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>

        {/* Pagination */}
        {filteredCalls.length > 0 && (
          <PaginationBar
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            itemsPerPage={itemsPerPage}
            totalItems={filteredCalls.length}
            onItemsPerPageChange={(items) => {
              setItemsPerPage(items);
              setCurrentPage(1);
            }}
          />
        )}
      </div>

      <DevControls
        onEmptyStateToggle={() => setShowEmptyState(!showEmptyState)}
        onLargeDataToggle={() => setShowLargeDataset(!showLargeDataset)}
        currentPage={currentPage}
        totalPages={totalPages}
      />

      {/* Notifications Dialog */}
      <Dialog open={showNotifications} onOpenChange={setShowNotifications}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Notifications</DialogTitle>
            <DialogDescription className="text-sm">
              Recent AI Receptionist notifications and alerts
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-3">
            {mockNotifications.map((notification, index) => (
              <motion.div
                key={notification.id}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: index * 0.05 }}
                className="p-3 bg-gray-50 rounded-lg border-l-4"
                style={{ borderLeftColor: notification.status === 'delivered' ? '#27AE60' : '#F2994A' }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-[#333333] mb-1">{notification.patient} - {notification.type}</h3>
                    <p className="text-xs text-gray-600">{notification.message}</p>
                  </div>
                  <span className="text-xs text-gray-400">{notification.sentAt}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
