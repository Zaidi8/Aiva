import { useState, useEffect } from 'react';
import { Bot, Phone, TrendingUp, CheckCircle, Search, X, PhoneCall, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { ScrollArea } from '../ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { TopBar } from '../ui/TopBar';
import { DevControls } from '../ui/DevControls';
import { PaginationBar } from '../ui/PaginationBar';
import { CallRecord } from '../ui/CallRecord';
import DateRangePicker from '../ui/date-range-picker';
import { motion } from 'motion/react';
import { mockCalls, mockNotifications } from '../../data/mockData';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';

interface NewAIReceptionistPageProps {
  onNavigate?: (page: string) => void;
}

interface DateRange {
  start: string | null;
  end: string | null;
}

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

  // Generate large dataset if enabled
  const largeDataset = showLargeDataset
    ? Array.from({ length: 50 }, (_, i) => ({
        ...mockCalls[i % mockCalls.length],
        id: `${i + 1}`,
        patient: `${mockCalls[i % mockCalls.length].patient} ${i + 1}`,
      }))
    : mockCalls;

  const allCalls = showEmptyState ? [] : largeDataset;

  // Apply filters
  const filteredCalls = allCalls.filter((call) => {
    const matchesSearch =
      call.patient.toLowerCase().includes(searchQuery.toLowerCase()) ||
      call.patientPhone.includes(searchQuery);
    const matchesStatus = statusFilter === 'all' || call.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Set first call as selected by default
  useEffect(() => {
    if (filteredCalls.length > 0 && !selectedCall) {
      setSelectedCall(filteredCalls[0].id);
    }
  }, [filteredCalls, selectedCall]);

  const selectedCallData = allCalls.find((c) => c.id === selectedCall);

  // Pagination
  const totalPages = Math.ceil(filteredCalls.length / itemsPerPage);
  const paginatedCalls = filteredCalls.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getActionBadge = (call: any) => {
    const actionMap = {
      success: { text: 'Booked', color: '#27AE60', tooltip: 'Appointment successfully booked' },
      failed: { text: 'Assisted', color: '#F2994A', tooltip: 'Provided assistance but no booking' },
    };
    const action = actionMap[call.status as keyof typeof actionMap] || actionMap.success;
    return action;
  };

  return (
    <div className="min-h-screen bg-[#F7F9FB]">
      <TopBar
        title="AI Receptionist"
        description="Monitor and manage AI voice assistant call activity & performance"
        notificationCount={mockNotifications.length}
        onNotificationsClick={() => setShowNotifications(true)}
      />

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Status Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              label: 'Calls Handled Today',
              value: '47',
              icon: PhoneCall,
              gradient: true,
            },
            {
              label: 'Successful Bookings',
              value: '32',
              icon: CheckCircle,
              color: '#27AE60',
            },
            {
              label: 'Success Rate',
              value: '94%',
              icon: TrendingUp,
              color: '#56CCF2',
            },
            {
              label: 'Avg. Call Duration',
              value: '3:15',
              icon: Clock,
              color: '#F2994A',
            },
          ].map((stat, index) => (
            <motion.div
              key={index}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.05, y: -5 }}
            >
              <Card className="hover:shadow-lg transition-all cursor-pointer border-none">
                <CardContent className="p-6">
                  <div
                    className={`w-10 h-10 rounded-lg mb-3 flex items-center justify-center ${
                      stat.gradient
                        ? 'bg-gradient-to-br from-[#2F80ED] to-[#56CCF2]'
                        : ''
                    }`}
                    style={{
                      backgroundColor: stat.gradient ? undefined : `${stat.color}15`,
                    }}
                  >
                    <stat.icon
                      className="w-5 h-5"
                      style={{ color: stat.gradient ? 'white' : stat.color }}
                    />
                  </div>
                  <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                  <p className="text-3xl text-[#333333]">{stat.value}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Search and Filter */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex flex-col sm:flex-row gap-4"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Search call records..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48 h-12">
              <SelectValue placeholder="Filter by outcome" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Calls</SelectItem>
              <SelectItem value="success">Successful</SelectItem>
              <SelectItem value="failed">Assisted</SelectItem>
            </SelectContent>
          </Select>
          <DateRangePicker value={dateRange} onChange={setDateRange} />
        </motion.div>

        {/* Call Records */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Call List */}
            <div className="lg:col-span-2">
              <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                <CardHeader className="border-b bg-white">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Recent Calls</CardTitle>
                    <Badge variant="outline" className="text-xs">
                      {filteredCalls.length} total
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {filteredCalls.length === 0 ? (
                    <div className="p-12 text-center">
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
                  ) : (
                    <ScrollArea className="h-[600px]">
                      <div className="p-3 space-y-2">
                        {paginatedCalls.map((call, index) => (
                          <motion.div
                            key={call.id}
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: index * 0.05 }}
                            whileHover={{ scale: 1.02 }}
                            onClick={() => setSelectedCall(call.id)}
                            className={`p-3 rounded-lg transition-all cursor-pointer ${
                              selectedCall === call.id
                                ? 'bg-gradient-to-r from-[#2F80ED]/10 to-[#56CCF2]/10 border-2 border-[#2F80ED]/30'
                                : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-[#2F80ED] to-[#56CCF2] rounded-full flex items-center justify-center text-white text-sm shadow-sm flex-shrink-0">
                                <Phone className="w-5 h-5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                  <h3 className="text-sm font-medium text-[#333333] truncate">
                                    {call.patient}
                                  </h3>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger>
                                        <Badge
                                          className="text-xs px-2 py-0.5"
                                          style={{
                                            backgroundColor: `${getActionBadge(call).color}15`,
                                            color: getActionBadge(call).color,
                                          }}
                                        >
                                          {getActionBadge(call).text}
                                        </Badge>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>{getActionBadge(call).tooltip}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>
                                <p className="text-xs text-gray-500 truncate mb-1">
                                  {call.summary}
                                </p>
                                <div className="flex items-center gap-2 text-xs text-gray-400">
                                  <Clock className="w-3 h-3" />
                                  <span>{call.duration}</span>
                                  <span>•</span>
                                  <span>{call.startTime}</span>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Selected Call Details */}
            <div className="lg:col-span-3">
              <Card className="overflow-hidden hover:shadow-lg transition-shadow h-[660px]">
                {selectedCallData ? (
                  <>
                    <CardHeader className="border-b bg-white">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-[#2F80ED] to-[#56CCF2] rounded-full flex items-center justify-center text-white text-sm">
                            <Phone className="w-5 h-5" />
                          </div>
                          <div>
                            <CardTitle className="text-base">{selectedCallData.patient}</CardTitle>
                            <CardDescription className="text-xs">{selectedCallData.patientPhone}</CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <Badge
                                  className="text-xs"
                                  style={{
                                    backgroundColor: `${getActionBadge(selectedCallData).color}15`,
                                    color: getActionBadge(selectedCallData).color,
                                  }}
                                >
                                  {getActionBadge(selectedCallData).text}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{getActionBadge(selectedCallData).tooltip}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedCall(null)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6">
                      <CallRecord
                        transcript={selectedCallData.transcript}
                        patientName={selectedCallData.patient}
                        duration={selectedCallData.duration}
                        callQuality={selectedCallData.callQuality}
                        sentiment={selectedCallData.sentiment}
                      />
                    </CardContent>
                  </>
                ) : (
                  <div className="h-full flex items-center justify-center p-12 text-center">
                    <div>
                      <Bot className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg text-gray-600 mb-2">Select a Call</h3>
                      <p className="text-sm text-gray-500">
                        Click on a call from the list to view the recording transcript
                      </p>
                    </div>
                  </div>
                )}
              </Card>
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
          <div className="space-y-3 mt-3">
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
