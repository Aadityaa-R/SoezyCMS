import React, { useState, useMemo } from 'react';
import { useClinic } from '@/context/ClinicContext';
import { useAuth } from '@/context/AuthContext';
import { useAttendance } from '@/context/AttendanceContext';
import { BRAND_CONFIG } from '@/brand.config';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Tabs, TabItem } from '@/components/ui/Tabs';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/Table';
import {
  Stethoscope,
  Clock,
  UserCheck,
  MapPin,
  Phone,
  Mail,
  Activity,
  CheckCircle2,
  Building2,
  Search,
} from 'lucide-react';
import { CANONICAL_STAFF_IDS } from '@/lib/staffIds';

interface ClinicStaffViewProps {
  onNavigate?: (tab: string, subTab?: string) => void;
}

export const ClinicStaffView: React.FC<ClinicStaffViewProps> = ({ onNavigate: _onNavigate }) => {
  const { doctors, appointments, patientAssignments } = useClinic();
  const { staffAccessList } = useAuth();
  const { shifts, records, getTodayRecord, getStaffShift } = useAttendance();

  const [activeTab, setActiveTab] = useState<'overview' | 'doctors' | 'all_staff'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'on_duty' | 'off_duty'>('all');
  const [selectedStaffMember, setSelectedStaffMember] = useState<{
    id: string;
    name: string;
    title: string;
    department: string;
    badgeNumber: string;
    role: string;
    phone?: string;
    email?: string;
    roomNumber?: string;
    specialization?: string;
    qualification?: string;
    consultationFee?: number;
    isDoctor: boolean;
    doctorId?: string;
    shiftDays?: string[];
    shiftStart?: string;
    shiftEnd?: string;
    clockInTime?: string;
    clockOutTime?: string;
    isOnDuty: boolean;
  } | null>(null);

  // Canonical mapping for doctors to staff account IDs
  const doctorStaffIdMap: Record<string, string> = {
    'doc-1': CANONICAL_STAFF_IDS.VANCE,
    'doc-2': CANONICAL_STAFF_IDS.HAYES,
    'doc-3': CANONICAL_STAFF_IDS.REED,
  };

  // Compile full staff roster with attendance and live presence
  const staffRoster = useMemo(() => {
    // Start with all granted staff records from auth
    const list = staffAccessList
      .filter((s) => s.role !== 'patient')
      .map((staff) => {
        const staffShift = getStaffShift(staff.id);
        const todayRec = getTodayRecord(staff.id);
        const isOnDuty = Boolean(todayRec?.clockIn && !todayRec?.clockOut);

        // Find linked doctor record if physician
        const linkedDoctor = doctors.find((doc) => {
          const expectedStaffId = doctorStaffIdMap[doc.id];
          return (
            expectedStaffId === staff.id ||
            doc.name.toLowerCase() === staff.staffName.toLowerCase() ||
            staff.badgeNumber.toLowerCase().includes(doc.id)
          );
        });

        return {
          id: staff.id,
          name: staff.staffName,
          title: staff.staffTitle,
          department: staff.department,
          badgeNumber: staff.badgeNumber,
          role: staff.role,
          phone: linkedDoctor?.phone || (staff.id === 'acc-adm-1' ? '+1 (555) 100-4001' : '+1 (555) 100-3001'),
          email: linkedDoctor?.email || (staff.id === 'acc-adm-1' ? 'admin@beaconclinic.com' : `${staff.staffName.toLowerCase().replace(/[^a-z]/g, '.')}@clinic.ops`),
          roomNumber: linkedDoctor?.roomNumber || (staff.role === 'admin' ? 'Admin Suite 4' : 'Front Reception Counter'),
          specialization: linkedDoctor?.specialization,
          qualification: linkedDoctor?.qualification,
          consultationFee: linkedDoctor?.consultationFee,
          isDoctor: Boolean(linkedDoctor || staff.role === 'doctor' || staff.role === 'md'),
          doctorId: linkedDoctor?.id,
          shiftDays: staffShift?.days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
          shiftStart: staffShift?.start || '09:00',
          shiftEnd: staffShift?.end || '17:00',
          clockInTime: todayRec?.clockIn ? todayRec.clockIn.substring(11, 16) : undefined,
          clockOutTime: todayRec?.clockOut ? todayRec.clockOut.substring(11, 16) : undefined,
          isOnDuty,
        };
      });

    return list;
  }, [staffAccessList, doctors, shifts, records, getStaffShift, getTodayRecord]);

  // Doctors list with live appointment queues
  const doctorRoster = useMemo(() => {
    return doctors.map((doc) => {
      const canonicalStaffId = doctorStaffIdMap[doc.id] || doc.id;
      const staffInfo = staffRoster.find((s) => s.id === canonicalStaffId || s.name === doc.name);
      const todayRec = getTodayRecord(canonicalStaffId);
      const isOnDuty = Boolean(todayRec?.clockIn && !todayRec?.clockOut);

      // Appointments for this doctor today
      const docAppointments = appointments.filter((a) => a.doctorId === doc.id);
      const inConsultationCount = docAppointments.filter((a) => a.status === 'in_consultation').length;
      const checkedInWaitingCount = docAppointments.filter((a) => a.status === 'checked_in').length;
      const totalTodayAppointments = docAppointments.length;
      const assignedPatientsCount = patientAssignments.filter((pa) => pa.doctorId === doc.id).length;

      return {
        ...doc,
        canonicalStaffId,
        isOnDuty,
        clockInTime: todayRec?.clockIn ? todayRec.clockIn.substring(11, 16) : undefined,
        shiftStart: staffInfo?.shiftStart || '09:00',
        shiftEnd: staffInfo?.shiftEnd || '17:00',
        shiftDays: staffInfo?.shiftDays || doc.availableDays,
        inConsultationCount,
        checkedInWaitingCount,
        totalTodayAppointments,
        assignedPatientsCount,
      };
    });
  }, [doctors, staffRoster, appointments, patientAssignments, getTodayRecord]);

  // Quick KPI metrics
  const doctorsOnDutyCount = doctorRoster.filter((d) => d.isOnDuty).length;
  const totalStaffPresentCount = staffRoster.filter((s) => s.isOnDuty).length;
  const totalCliniciansCount = doctorRoster.length;
  const totalDepartments = Array.from(new Set(staffRoster.map((s) => s.department))).length;

  // Filtered staff list
  const filteredStaff = useMemo(() => {
    return staffRoster.filter((staff) => {
      const matchSearch =
        staff.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        staff.badgeNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        staff.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        staff.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (staff.specialization && staff.specialization.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchDept = deptFilter === 'all' || staff.department.toLowerCase().includes(deptFilter.toLowerCase());
      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'on_duty' && staff.isOnDuty) ||
        (statusFilter === 'off_duty' && !staff.isOnDuty);

      return matchSearch && matchDept && matchStatus;
    });
  }, [staffRoster, searchTerm, deptFilter, statusFilter]);

  const tabs: TabItem[] = [
    { id: 'overview', label: 'Overview & Rosters' },
    { id: 'doctors', label: `Physicians (${doctorRoster.length})` },
    { id: 'all_staff', label: `All Staff Directory (${staffRoster.length})` },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Page Title & Navigation Tabs */}
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Clinic Staff & Roster
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time on-duty doctor presence, healthcare workstation staffing, shift schedules, and clinician directory.
          </p>
        </div>

        <Tabs
          tabs={tabs}
          activeTab={activeTab}
          onChange={(tab) => setActiveTab(tab as any)}
          ariaLabel="Clinic Staff Navigation"
        />
      </div>

      {/* KPI Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Doctors On Duty</span>
            <span
              className="w-2.5 h-2.5 rounded-full animate-pulse"
              style={{ backgroundColor: BRAND_CONFIG.accentColor }}
            />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {doctorsOnDutyCount}
            </span>
            <span className="text-xs text-slate-400">/ {totalCliniciansCount} physicians</span>
          </div>
        </Card>

        <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Staff Present</span>
            <UserCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {totalStaffPresentCount}
            </span>
            <span className="text-xs text-slate-400">/ {staffRoster.length} staff</span>
          </div>
        </Card>

        <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">In Active Consultation</span>
            <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {doctorRoster.reduce((acc, d) => acc + d.inConsultationCount, 0)}
            </span>
            <span className="text-xs text-slate-400">patients with doctors</span>
          </div>
        </Card>

        <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Departments Active</span>
            <Building2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {totalDepartments}
            </span>
            <span className="text-xs text-slate-400">departments</span>
          </div>
        </Card>
      </div>

      {/* Tab 1: Overview & Featured On-Duty Doctors */}
      {(activeTab === 'overview' || activeTab === 'doctors') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Physicians & Consulting Doctors
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Active clinical workstations, consultation rooms, and live appointment worklists.
              </p>
            </div>
            {activeTab === 'overview' && (
              <Button
                variant="outline"
                size="xs"
                onClick={() => setActiveTab('doctors')}
              >
                View all physicians
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {doctorRoster.map((doc) => (
              <Card
                key={doc.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between"
              >
                <div className="p-5 space-y-4">
                  {/* Top Header: Avatar + Presence Badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm shrink-0"
                        style={{
                          backgroundColor: BRAND_CONFIG.accentColorLight,
                          color: BRAND_CONFIG.accentColorDark,
                        }}
                      >
                        {doc.name.replace('Dr. ', '').split(' ').map((n) => n[0]).join('')}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                          {doc.name}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {doc.specialization}
                        </p>
                      </div>
                    </div>

                    {/* Status Pill */}
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold shrink-0 ${
                        doc.isOnDuty
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          doc.isOnDuty ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                        }`}
                      />
                      {doc.isOnDuty ? 'On Duty' : 'Off Duty'}
                    </span>
                  </div>

                  {/* Room & Department Badges */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      {doc.roomNumber}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                      <Building2 className="w-3 h-3 text-slate-400" />
                      {doc.department}
                    </span>
                  </div>

                  {/* Shift Hours & Clock-in status */}
                  <div className="p-3 bg-slate-50/60 dark:bg-slate-800/40 rounded-lg border border-slate-100 dark:border-slate-800 text-xs space-y-1.5">
                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        Shift Timing:
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {doc.consultationHours || `${doc.shiftStart} - ${doc.shiftEnd}`}
                      </span>
                    </div>

                    {doc.isOnDuty && doc.clockInTime && (
                      <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          Clocked In Today:
                        </span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {doc.clockInTime}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Patient Queue & Workload Counters */}
                  <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800 text-center">
                    <div className="p-1.5 bg-slate-50/40 dark:bg-slate-800/20 rounded">
                      <div className="text-xs text-slate-400">In Care</div>
                      <div className="text-sm font-bold text-blue-600 dark:text-blue-400">
                        {doc.inConsultationCount}
                      </div>
                    </div>
                    <div className="p-1.5 bg-slate-50/40 dark:bg-slate-800/20 rounded">
                      <div className="text-xs text-slate-400">In Queue</div>
                      <div className="text-sm font-bold text-amber-600 dark:text-amber-400">
                        {doc.checkedInWaitingCount}
                      </div>
                    </div>
                    <div className="p-1.5 bg-slate-50/40 dark:bg-slate-800/20 rounded">
                      <div className="text-xs text-slate-400">Assigned</div>
                      <div className="text-sm font-bold text-slate-700 dark:text-slate-300">
                        {doc.assignedPatientsCount}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="px-5 py-3 bg-slate-50/80 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 rounded-b-xl flex items-center justify-between">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Fee: ₹{(doc.consultationFee / 100).toFixed(2)}
                  </span>
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => {
                      const staffItem = staffRoster.find((s) => s.id === doc.canonicalStaffId || s.name === doc.name);
                      if (staffItem) {
                        setSelectedStaffMember(staffItem);
                      }
                    }}
                  >
                    View Roster Details
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: All Clinic Staff Directory Table */}
      {(activeTab === 'overview' || activeTab === 'all_staff') && (
        <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
          <CardHeader className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                Clinic Staff Directory
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Full personnel roster across administration, physicians, nursing, and reception.
              </CardDescription>
            </div>

            {/* Filters & Search Controls */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Search Bar */}
              <div className="relative w-48 sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search staff, role, badge..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Department Filter */}
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none"
              >
                <option value="all">All Departments</option>
                <option value="internal">Internal Medicine</option>
                <option value="general">General Medicine</option>
                <option value="outpatient">Outpatient / Family</option>
                <option value="reception">Reception & Front Desk</option>
                <option value="admin">Administration</option>
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="on_duty">On Duty Now</option>
                <option value="off_duty">Off Duty</option>
              </select>
            </div>
          </CardHeader>

          {/* Staff Table */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead kind="text">Staff Member</TableHead>
                  <TableHead kind="text">Department & Station</TableHead>
                  <TableHead kind="text">Shift Schedule</TableHead>
                  <TableHead kind="short">Duty Status</TableHead>
                  <TableHead kind="text">Contact</TableHead>
                  <TableHead kind="short">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStaff.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-xs text-slate-400">
                      No staff members match the selected filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStaff.map((staff) => (
                    <TableRow key={staff.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      {/* Staff Member */}
                      <TableCell kind="text">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0"
                            style={{
                              backgroundColor: BRAND_CONFIG.accentColorLight,
                              color: BRAND_CONFIG.accentColorDark,
                            }}
                          >
                            {staff.name.replace('Dr. ', '').split(' ').map((n) => n[0]).join('')}
                          </div>
                          <div>
                            <div className="font-semibold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                              {staff.name}
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                                {staff.badgeNumber}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
                              {staff.title}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      {/* Department & Station */}
                      <TableCell kind="text">
                        <div className="text-xs text-slate-800 dark:text-slate-200 font-medium">
                          {staff.department}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {staff.roomNumber}
                        </div>
                      </TableCell>

                      {/* Shift Schedule */}
                      <TableCell kind="text">
                        <div className="text-xs text-slate-800 dark:text-slate-200 font-medium">
                          {staff.shiftStart} - {staff.shiftEnd}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {staff.shiftDays.join(', ')}
                        </div>
                      </TableCell>

                      {/* Duty Status */}
                      <TableCell kind="short">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            staff.isOnDuty
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              staff.isOnDuty ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                            }`}
                          />
                          {staff.isOnDuty ? 'On Duty' : 'Off Duty'}
                        </span>
                      </TableCell>

                      {/* Contact */}
                      <TableCell kind="text">
                        <div className="text-xs text-slate-700 dark:text-slate-300">
                          {staff.phone}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[140px]">
                          {staff.email}
                        </div>
                      </TableCell>

                      {/* Action */}
                      <TableCell kind="short">
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => setSelectedStaffMember(staff)}
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Staff Details Modal */}
      {selectedStaffMember && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedStaffMember(null)}
          title={`${selectedStaffMember.name} - Personnel Profile`}
          maxWidth="lg"
        >
          <div className="space-y-5 p-1">
            {/* Header profile banner */}
            <div className="flex items-start gap-4 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-base shrink-0"
                style={{
                  backgroundColor: BRAND_CONFIG.accentColorLight,
                  color: BRAND_CONFIG.accentColorDark,
                }}
              >
                {selectedStaffMember.name.replace('Dr. ', '').split(' ').map((n) => n[0]).join('')}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
                    {selectedStaffMember.name}
                  </h3>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      selectedStaffMember.isOnDuty
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        selectedStaffMember.isOnDuty ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                      }`}
                    />
                    {selectedStaffMember.isOnDuty ? 'Currently On Duty' : 'Off Duty'}
                  </span>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {selectedStaffMember.title} • {selectedStaffMember.department}
                </p>

                <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
                  <span className="font-mono bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                    Badge: {selectedStaffMember.badgeNumber}
                  </span>
                  <span className="bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                    Station: {selectedStaffMember.roomNumber}
                  </span>
                </div>
              </div>
            </div>

            {/* Information Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg space-y-1">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" /> Direct Email
                </span>
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  {selectedStaffMember.email}
                </p>
              </div>

              <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg space-y-1">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" /> Direct Contact Phone
                </span>
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  {selectedStaffMember.phone}
                </p>
              </div>

              <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg space-y-1">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> Working Shift
                </span>
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  {selectedStaffMember.shiftStart} - {selectedStaffMember.shiftEnd} ({selectedStaffMember.shiftDays?.join(', ')})
                </p>
              </div>

              <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg space-y-1">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Today's Clock In
                </span>
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  {selectedStaffMember.clockInTime ? `${selectedStaffMember.clockInTime} (Logged In)` : 'Not clocked in today'}
                </p>
              </div>
            </div>

            {/* If Physician: Workload and Specialization details */}
            {selectedStaffMember.isDoctor && (
              <div className="space-y-3 p-4 bg-slate-50/70 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/80">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  Clinical Credentials & Workload
                </h4>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400">Specialization:</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      {selectedStaffMember.specialization || 'General Clinical Practice'}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400">Qualifications:</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      {selectedStaffMember.qualification || 'MBBS'}
                    </p>
                  </div>
                </div>

                {/* Today's Queue Preview if doctor */}
                {selectedStaffMember.doctorId && (
                  <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-2">
                      Today's Scheduled Consultations:
                    </span>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {appointments.filter((a) => a.doctorId === selectedStaffMember.doctorId).length === 0 ? (
                        <p className="text-xs text-slate-400 italic">No scheduled visits for this doctor today.</p>
                      ) : (
                        appointments
                          .filter((a) => a.doctorId === selectedStaffMember.doctorId)
                          .map((appt) => (
                            <div
                              key={appt.id}
                              className="flex items-center justify-between p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 text-xs"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-slate-400">
                                  {appt.dateTime ? appt.dateTime.substring(11, 16) : '09:00'}
                                </span>
                                <span className="font-semibold text-slate-900 dark:text-white">{appt.patientName}</span>
                              </div>
                              <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                {appt.status.replace('_', ' ')}
                              </span>
                            </div>
                          ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedStaffMember(null)}
              >
                Close Profile
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
