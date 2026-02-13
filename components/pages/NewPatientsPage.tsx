import { useState } from 'react';
import { Search, Plus, User, Phone, Calendar, Eye, Filter } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { TopBar } from '../ui/TopBar';
import { DevControls } from '../ui/DevControls';
import { PaginationBar } from '../ui/PaginationBar';
import { AddPatientModal } from '../ui/AddPatientModal';
import { PatientRecordModal } from '../ui/PatientRecordModal';
import DateRangePicker from '../ui/date-range-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { motion } from 'motion/react';
import { mockPatients } from '../../data/mockData';

interface NewPatientsPageProps {
  onNavigate?: (page: string) => void;
}

interface DateRange {
  start: string | null;
  end: string | null;
}

export function NewPatientsPage({ onNavigate }: NewPatientsPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<DateRange>({ start: null, end: null });
  const [showEmptyState, setShowEmptyState] = useState(false);
  const [isAddPatientModalOpen, setIsAddPatientModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showLargeDataset, setShowLargeDataset] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Generate large dataset if enabled
  const largeDataset = showLargeDataset
    ? Array.from({ length: 50 }, (_, i) => ({
        ...mockPatients[i % mockPatients.length],
        id: `${i + 1}`,
        name: `${mockPatients[i % mockPatients.length].name} ${i + 1}`,
      }))
    : mockPatients;

  const filteredPatients = (showEmptyState ? [] : largeDataset).filter((patient) => {
    const matchesSearch =
      patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.phone.includes(searchQuery);
    const matchesDateRange =
      !dateRange.start || !dateRange.end
        ? true
        : new Date(patient.lastVisit) >= new Date(dateRange.start) && new Date(patient.lastVisit) <= new Date(dateRange.end);
    return matchesSearch && matchesDateRange;
  });

  const totalPages = Math.ceil(filteredPatients.length / itemsPerPage);
  const paginatedPatients = filteredPatients.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="min-h-screen bg-[#F7F9FB]">
      <TopBar
        title="Patient Records"
        description="Manage patient information and medical history"
        actionButton={
          <Button 
            className="bg-gradient-to-r from-[#2F80ED] to-[#56CCF2] hover:opacity-90 shadow-md"
            onClick={() => setIsAddPatientModalOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Patient
          </Button>
        }
      />

      <div className="p-8 max-w-7xl mx-auto space-y-8">
        {/* Search and Filters */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex flex-col sm:flex-row gap-4"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Search patients by name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12"
            />
          </div>
          <DateRangePicker
            value={dateRange}
            onChange={setDateRange}
          />
        </motion.div>

        {/* Stats */}
        {!showEmptyState && (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
            {[
              { label: 'Total Patients', value: filteredPatients.length, color: '#2F80ED' },
              { label: 'Active Today', value: '8', color: '#27AE60' },
              { label: 'Upcoming Visits', value: '12', color: '#56CCF2' },
              { label: 'New This Month', value: '24', color: '#F2994A' },
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
                      className="w-10 h-10 rounded-lg mb-3 flex items-center justify-center"
                      style={{ backgroundColor: `${stat.color}15` }}
                    >
                      <User className="w-5 h-5" style={{ color: stat.color }} />
                    </div>
                    <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                    <p className="text-3xl text-[#333333]">{stat.value}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* Patients List */}
        {paginatedPatients.length === 0 ? (
          <Card className="border-2 border-dashed border-gray-300">
            <CardContent className="p-12 text-center">
              <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl text-gray-600 mb-2">No Patients Found</h3>
              <p className="text-gray-500 mb-6">
                {showEmptyState
                  ? 'Start by adding your first patient.'
                  : 'Try adjusting your search query.'}
              </p>
              <Button 
                className="bg-[#2F80ED] hover:bg-[#2F80ED]/90"
                onClick={() => setIsAddPatientModalOpen(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Patient
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {paginatedPatients.map((patient, index) => (
              <motion.div
                key={patient.id}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.02, x: 5 }}
              >
                <Card className="hover:shadow-lg transition-all cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-6 flex-wrap">
                      <div className="w-16 h-16 bg-gradient-to-br from-[#2F80ED] to-[#56CCF2] rounded-full flex items-center justify-center text-white text-xl shadow-md flex-shrink-0">
                        {patient.name.split(' ').map((n) => n[0]).join('')}
                      </div>

                      <div className="flex-1 min-w-0 space-y-3">
                        <div className="flex items-start justify-between flex-wrap gap-2">
                          <div>
                            <h3 className="text-xl text-[#333333] font-medium mb-1">
                              {patient.name}
                            </h3>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <span>
                                {patient.age} years • {patient.gender}
                              </span>
                            </div>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="hover:bg-[#2F80ED] hover:text-white transition-all"
                            onClick={() => setSelectedPatient(patient)}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View Full Record
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Phone className="w-4 h-4" />
                            {patient.phone}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Calendar className="w-4 h-4" />
                            Last visit: {patient.lastVisit}
                          </div>
                        </div>

                        {patient.upcomingAppointment && (
                          <div className="p-3 bg-[#27AE60]/10 rounded-lg border border-[#27AE60]/20">
                            <p className="text-sm text-[#27AE60] font-medium">
                              Upcoming: {patient.upcomingAppointment}
                            </p>
                          </div>
                        )}

                        <div className="flex items-center gap-2 flex-wrap">
                          {patient.medicalHistory.slice(0, 3).map((condition, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {condition}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {filteredPatients.length > 0 && (
          <PaginationBar
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            itemsPerPage={itemsPerPage}
            totalItems={filteredPatients.length}
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

      <AddPatientModal
        isOpen={isAddPatientModalOpen}
        onClose={() => setIsAddPatientModalOpen(false)}
      />

      {/* Patient Full Record Modal */}
      <PatientRecordModal
        isOpen={!!selectedPatient}
        patient={selectedPatient}
        onClose={() => setSelectedPatient(null)}
      />
    </div>
  );
}