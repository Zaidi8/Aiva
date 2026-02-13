import { useState } from 'react';
import { Settings2, Database, Bell, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from './button';
import { motion, AnimatePresence } from 'motion/react';

interface DevControlsProps {
  onEmptyStateToggle?: () => void;
  onTestNotification?: () => void;
  onLargeDataToggle?: () => void;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  itemsPerPage?: number;
  onItemsPerPageChange?: (items: number) => void;
}

export function DevControls({
  onEmptyStateToggle,
  onTestNotification,
  onLargeDataToggle,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  itemsPerPage = 10,
  onItemsPerPageChange,
}: DevControlsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className="fixed bottom-6 right-6 z-50"
    >
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-6 mb-4 w-80"
          >
            <h3 className="text-lg font-medium text-[#333333] mb-4 flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-[#2F80ED]" />
              Dev Controls
            </h3>

            <div className="space-y-3">
              {onEmptyStateToggle && (
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2 hover:bg-gray-50"
                    onClick={onEmptyStateToggle}
                  >
                    <Database className="w-4 h-4" />
                    Toggle Empty State
                  </Button>
                </motion.div>
              )}

              {onLargeDataToggle && (
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2 hover:bg-gray-50"
                    onClick={onLargeDataToggle}
                  >
                    <Database className="w-4 h-4" />
                    Toggle Large Dataset
                  </Button>
                </motion.div>
              )}

              {onTestNotification && (
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2 hover:bg-gray-50"
                    onClick={onTestNotification}
                  >
                    <Bell className="w-4 h-4" />
                    Test Notification
                  </Button>
                </motion.div>
              )}

              {onItemsPerPageChange && (
                <div className="space-y-2">
                  <label className="text-sm text-gray-600">Items per page</label>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2F80ED]"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              )}

              {onPageChange && totalPages > 1 && (
                <div className="space-y-2 pt-3 border-t border-gray-200">
                  <label className="text-sm text-gray-600">
                    Page {currentPage} of {totalPages}
                  </label>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-14 h-14 bg-gradient-to-r from-[#2F80ED] to-[#56CCF2] rounded-full shadow-xl flex items-center justify-center text-white hover:shadow-2xl transition-shadow"
      >
        {isExpanded ? (
          <ChevronDown className="w-6 h-6" />
        ) : (
          <Settings2 className="w-6 h-6" />
        )}
      </motion.button>
    </motion.div>
  );
}
