import React, { useState, useMemo } from 'react';
import { useClinic } from '@/context/ClinicContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Table, ColumnDef } from '@/components/ui/Table';
import { Pagination } from '@/components/ui/Pagination';
import { DatePicker } from '@/components/ui/DatePicker';
import { Select } from '@/components/ui/Select';
import { InteractiveSearchBar } from '@/components/ui/InteractiveSearchBar';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  Stethoscope,
  CalendarDays,
  CalendarCheck,
  CalendarClock,
  CalendarX,
  RotateCcw,
} from 'lucide-react';
import { formatLocalDate, formatTime } from '@/lib/time';
import { Appointment } from '@/types';

// Helper to shift a YYYY-MM-DD date by N days
function shiftDate(dateStr: string, deltaDays: number): string {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + deltaDays);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return dateStr;
  }
}

// Format readable date header (e.g. "Thursday, Oct 29, 2026")
function formatDisplayDate(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export const AppointmentsView: React.FC = () => {
  const { appointments: allAppointments = [], doctors = [] } = useClinic();

  const todayStr = useMemo(() => formatLocalDate(), []);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Filter appointments for the selected day
  const dayAppointments = useMemo(() => {
    return allAppointments.filter((apt) => {
      const aptDate = apt.dateTime ? apt.dateTime.slice(0, 10) : '';
      return aptDate === selectedDate;
    });
  }, [allAppointments, selectedDate]);

  // Volume metrics for the selected day
  const metrics = useMemo(() => {
    const total = dayAppointments.length;
    const completed = dayAppointments.filter((a) => a.status === 'completed').length;
    const inProgress = dayAppointments.filter(
      (a) => a.status === 'in_consultation' || a.status === 'checked_in'
    ).length;
    const scheduled = dayAppointments.filter((a) => a.status === 'scheduled').length;
    const cancelled = dayAppointments.filter((a) => a.status === 'cancelled').length;

    return { total, completed, inProgress, scheduled, cancelled };
  }, [dayAppointments]);

  // Apply search and filter criteria
  const filteredAppointments = useMemo(() => {
    return dayAppointments
      .filter((apt) => {
        // Doctor filter
        if (selectedDoctorId !== 'all' && apt.doctorId !== selectedDoctorId) {
          return false;
        }
        // Status filter
        if (selectedStatus !== 'all' && apt.status !== selectedStatus) {
          return false;
        }
        // Search filter (patient name, doctor name, reason, token)
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase().trim();
          const pName = apt.patientName?.toLowerCase() || '';
          const dName = apt.doctorName?.toLowerCase() || '';
          const reason = apt.reasonForVisit?.toLowerCase() || '';
          const token = String(apt.tokenNumber || '');
          if (!pName.includes(q) && !dName.includes(q) && !reason.includes(q) && !token.includes(q)) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => (a.dateTime || '').localeCompare(b.dateTime || ''));
  }, [dayAppointments, selectedDoctorId, selectedStatus, searchTerm]);

  // Paginated slice
  const paginatedAppointments = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAppointments.slice(start, start + pageSize);
  }, [filteredAppointments, currentPage]);

  const handlePrevDay = () => {
    setSelectedDate((prev) => shiftDate(prev, -1));
    setCurrentPage(1);
  };

  const handleNextDay = () => {
    setSelectedDate((prev) => shiftDate(prev, 1));
    setCurrentPage(1);
  };

  const handleToday = () => {
    setSelectedDate(todayStr);
    setCurrentPage(1);
  };

  const isToday = selectedDate === todayStr;

  // Table columns definition (Pure schedule view, no viewing patient file)
  const columns: ColumnDef<Appointment>[] = [
    {
      key: 'time',
      header: 'Time',
      kind: 'short',
      priority: 1,
      render: (apt) => (
        <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
          <Clock className="w-3.5 h-3.5 text-[#00c060] shrink-0" />
          <span>{formatTime(apt.dateTime)}</span>
        </div>
      ),
    },
    {
      key: 'token',
      header: 'Token',
      kind: 'short',
      priority: 4,
      render: (apt) => (
        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-300">
          #{apt.tokenNumber || '—'}
        </span>
      ),
    },
    {
      key: 'patient',
      header: 'Patient Name',
      kind: 'text',
      priority: 2,
      render: (apt) => (
        <div>
          <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>{apt.patientName}</span>
          </div>
          {apt.patientPhone && (
            <div className="text-[11px] text-slate-500 dark:text-slate-400 pl-5">
              {apt.patientPhone}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'doctor',
      header: 'Doctor & Department',
      kind: 'text',
      priority: 3,
      render: (apt) => (
        <div>
          <div className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <Stethoscope className="w-3.5 h-3.5 text-[#28465a] dark:text-slate-400 shrink-0" />
            <span>{apt.doctorName || 'Assigned Physician'}</span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 pl-5">
            {apt.department || 'General Medicine'}
          </div>
        </div>
      ),
    },
    {
      key: 'reason',
      header: 'Reason for Visit',
      kind: 'text',
      priority: 5,
      render: (apt) => (
        <span className="text-xs text-slate-600 dark:text-slate-400">
          {apt.reasonForVisit || 'General Consultation'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      kind: 'short',
      priority: 2,
      render: (apt) => {
        let badgeClass = 'bg-slate-100 text-slate-700 border-slate-200';
        let label = 'Scheduled';

        if (apt.status === 'completed') {
          badgeClass = 'bg-[#00c060]/10 text-[#00964b] border-[#00c060]/30 font-semibold';
          label = 'Completed';
        } else if (apt.status === 'in_consultation') {
          badgeClass = 'bg-[#20b2aa]/15 text-[#008080] border-[#20b2aa]/40 font-semibold';
          label = 'In Consultation';
        } else if (apt.status === 'checked_in') {
          badgeClass = 'bg-amber-50 text-amber-700 border-amber-200 font-semibold';
          label = 'Checked In';
        } else if (apt.status === 'cancelled') {
          badgeClass = 'bg-rose-50 text-rose-700 border-rose-200';
          label = 'Cancelled';
        }

        return (
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs border ${badgeClass}`}>
            {label}
          </span>
        );
      },
    },
  ];

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* 1. TOP HEADER & DATE CHANGER STRIP */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-[#28465a] flex items-center justify-center text-white shrink-0 shadow-sm">
              <Calendar className="w-6 h-6 text-[#00c060]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                  Appointments Schedule
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#28465a]/10 text-[#28465a] border border-[#28465a]/20">
                  Day-to-Day Volume Tracker
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Inspect daily patient volume and schedule tracking without clinical patient file records
              </p>
            </div>
          </div>

          {/* Quick "Today" shortcut */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={handleToday}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                isToday
                  ? 'bg-[#00c060] text-white border-[#00c060] shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-50'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Today</span>
            </button>
          </div>
        </div>

        {/* Date Selector Navigation Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrevDay}
              className="px-2.5 py-1.5 text-xs flex items-center gap-1 font-semibold"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous Day</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleNextDay}
              className="px-2.5 py-1.5 text-xs flex items-center gap-1 font-semibold"
            >
              <span>Next Day</span>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 hidden md:inline">
              Viewing Date:
            </span>
            <div className="w-48 sm:w-56">
              <DatePicker
                value={selectedDate}
                onChange={(newDate) => {
                  if (newDate) {
                    setSelectedDate(newDate);
                    setCurrentPage(1);
                  }
                }}
              />
            </div>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 whitespace-nowrap">
              {formatDisplayDate(selectedDate)}
            </span>
          </div>
        </div>
      </div>

      {/* 2. NUMBER OF DAY-TO-DAY APPOINTMENTS METRICS CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Total Appointments */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#28465a]/10 flex items-center justify-center text-[#28465a] shrink-0">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
              {metrics.total}
            </div>
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Total Booked
            </div>
          </div>
        </div>

        {/* Completed Visits */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#00c060]/10 flex items-center justify-center text-[#00964b] shrink-0">
            <CalendarCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-[#00964b] tabular-nums">
              {metrics.completed}
            </div>
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Completed
            </div>
          </div>
        </div>

        {/* In Consultation / Checked In */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#20b2aa]/15 flex items-center justify-center text-[#008080] shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-[#008080] tabular-nums">
              {metrics.inProgress}
            </div>
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              In Clinic / Waiting
            </div>
          </div>
        </div>

        {/* Scheduled Upcoming */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0">
            <CalendarClock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-200 tabular-nums">
              {metrics.scheduled}
            </div>
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Scheduled
            </div>
          </div>
        </div>

        {/* Cancelled */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center gap-3 col-span-2 sm:col-span-1">
          <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center text-rose-600 shrink-0">
            <CalendarX className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-rose-600 tabular-nums">
              {metrics.cancelled}
            </div>
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Cancelled
            </div>
          </div>
        </div>
      </div>

      {/* 3. APPOINTMENTS SCHEDULE TABLE */}
      <Card className="border border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <CardTitle>
              Day's Schedule: {formatDisplayDate(selectedDate)}
            </CardTitle>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Showing {filteredAppointments.length} appointments scheduled for this date
            </p>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
            {/* Search Input */}
            <div className="w-full sm:w-56">
              <InteractiveSearchBar
                value={searchTerm}
                onChange={(q) => {
                  setSearchTerm(q);
                  setCurrentPage(1);
                }}
                placeholder="Search patient or doctor..."
              />
            </div>

            {/* Doctor Filter */}
            <div className="w-full sm:w-44">
              <Select
                value={selectedDoctorId}
                onChange={(e) => {
                  setSelectedDoctorId(e.target.value);
                  setCurrentPage(1);
                }}
                options={[
                  { value: 'all', label: 'All Doctors' },
                  ...doctors.map((d) => ({ value: d.id, label: d.name })),
                ]}
              />
            </div>

            {/* Status Filter */}
            <div className="w-full sm:w-36">
              <Select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setCurrentPage(1);
                }}
                options={[
                  { value: 'all', label: 'All Statuses' },
                  { value: 'scheduled', label: 'Scheduled' },
                  { value: 'checked_in', label: 'Checked In' },
                  { value: 'in_consultation', label: 'In Visit' },
                  { value: 'completed', label: 'Completed' },
                  { value: 'cancelled', label: 'Cancelled' },
                ]}
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {filteredAppointments.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500 dark:text-slate-400 space-y-2">
              <Calendar className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto" />
              <p className="font-medium">No appointments found for this date.</p>
              <p className="text-[11px] text-slate-400">
                Use the date selector above or click "Previous Day" / "Next Day" to inspect other dates.
              </p>
            </div>
          ) : (
            <>
              <Table
                stackBelow="lg"
                columns={columns}
                data={paginatedAppointments}
                keyExtractor={(item) => item.id}
              />
              <Pagination
                currentPage={currentPage}
                totalItems={filteredAppointments.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AppointmentsView;
