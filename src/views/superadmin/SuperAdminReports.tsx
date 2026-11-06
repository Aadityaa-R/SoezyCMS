import React, { useState } from 'react';
import {
  Download,
  Printer,
} from 'lucide-react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, StatusDot } from '@/components/ui/Table';
import { useSuperAdmin } from '../../context/SuperAdminContext';

type ReportType =
  | 'branch_directory'
  | 'admin_assignment'
  | 'agreement_expiry'
  | 'facility_adoption'
  | 'onboarding_audit';

// Helper to format branch type labels cleanly in sentence case
const formatBranchType = (type: string): string => {
  if (!type) return '';
  const map: Record<string, string> = {
    main_hospital: 'Main hospital',
    speciality_center: 'Speciality center',
    outpatient_clinic: 'Outpatient clinic',
    diagnostic_lab: 'Diagnostic lab',
  };
  const key = type.toLowerCase().trim();
  if (map[key]) return map[key];
  const cleaned = type.replace(/_/g, ' ').toLowerCase();
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
};

export const SuperAdminReports: React.FC = () => {
  const {
    clinics,
    admins,
    agreements,
    facilities,
    onboarding,
  } = useSuperAdmin();

  const [activeReport, setActiveReport] = useState<ReportType>('branch_directory');

  // Helper for CSV export
  const exportToCSV = (filename: string, headers: string[], rows: (string | number)[][]) => {
    const csvContent = [
      headers.join(','),
      ...rows.map(row =>
        row
          .map(item => {
            const str = String(item ?? '');
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
              return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
          })
          .join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Branch Directory CSV
  const handleExportBranchDirectory = () => {
    const headers = ['Clinic ID', 'Code', 'Name', 'Branch Type', 'Operational Status', 'Onboarding Status', 'Phone', 'Email', 'City', 'State', 'Registered Date'];
    const rows = clinics.map(c => [
      c.id,
      c.code,
      c.name,
      c.branchType,
      c.status,
      c.onboardingStatus,
      c.phone || '',
      c.email || '',
      c.city || '',
      c.state || '',
      c.createdAt,
    ]);
    exportToCSV('branch_directory_report', headers, rows);
  };

  // Admin Assignment CSV
  const handleExportAdminAssignment = () => {
    const headers = ['Assignment ID', 'Clinic Name', 'Clinic Code', 'Admin Name', 'Email', 'Phone', 'Designation', 'Status', 'Effective From'];
    const rows = admins.map(a => {
      const clinic = clinics.find(c => c.id === a.clinicId);
      return [
        a.id,
        clinic?.name || 'Unlinked',
        clinic?.code || 'N/A',
        a.adminName,
        a.adminEmail,
        a.adminPhone || '',
        a.designation,
        a.status,
        a.effectiveFrom,
      ];
    });
    exportToCSV('admin_assignment_report', headers, rows);
  };

  // Agreement Expiry CSV
  const handleExportAgreements = () => {
    const headers = ['Agreement ID', 'Reference', 'Clinic Name', 'Type', 'Start Date', 'End Date', 'Status', 'Covered Facilities'];
    const rows = agreements.map(a => [
      a.id,
      a.agreementReference,
      a.clinicName,
      a.agreementType,
      a.startDate,
      a.endDate,
      a.status,
      a.coveredFacilities.join('; '),
    ]);
    exportToCSV('agreement_expiry_report', headers, rows);
  };

  // Facility Adoption CSV
  const handleExportFacilityAdoption = () => {
    const headers = ['Facility Code', 'Facility Name', 'Opted Branches Count', 'Entitled Branches Count', 'CMS Enabled Count', 'Configured Count'];
    const rows = facilities.map(f => {
      const opted = clinics.filter(c => (c.optedFacilities || []).includes(f.code)).length;
      const entitled = clinics.filter(c => (c.entitledFacilities || []).includes(f.code)).length;
      const enabled = clinics.filter(c => (c.enabledModules || []).includes(f.code)).length;
      return [f.code, f.name, opted, entitled, enabled, enabled];
    });
    exportToCSV('facility_adoption_report', headers, rows);
  };

  // Onboarding Audit CSV
  const handleExportOnboardingAudit = () => {
    const headers = ['Clinic Name', 'Clinic Code', 'Checklist Item', 'Mandatory', 'Status', 'Completed At', 'Overridden', 'Override Reason'];
    const rows: (string | number)[][] = [];
    clinics.forEach(c => {
      const items = onboarding.filter(i => i.clinicId === c.id);
      items.forEach(item => {
        rows.push([
          c.name,
          c.code,
          item.title,
          item.isMandatory ? 'Yes' : 'No',
          item.completed ? 'Completed' : item.isOverridden ? 'Overridden' : 'Pending',
          item.completedAt || '',
          item.isOverridden ? 'Yes' : 'No',
          item.overrideReason || '',
        ]);
      });
    });
    exportToCSV('onboarding_audit_report', headers, rows);
  };

  return (
    <div className="space-y-4">
      <h1 className="text-[22px] font-semibold text-slate-900 dark:text-slate-100 tracking-tight">Administrative reports</h1>

      {/* Report Switcher Tabs & Print */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 pb-px">
        <div className="flex flex-wrap gap-1">
          {[
            { key: 'branch_directory', label: '1. Branch directory' },
            { key: 'admin_assignment', label: '2. Admin assignments' },
            { key: 'agreement_expiry', label: '3. Agreement expiry & renewals' },
            { key: 'facility_adoption', label: '4. Facility adoption matrix' },
            { key: 'onboarding_audit', label: '5. Onboarding audit trail' },
          ].map(tab => {
            const isActive = activeReport === tab.key;

            return (
              <button
                key={tab.key}
                onClick={() => setActiveReport(tab.key as ReportType)}
                className={`px-3.5 py-2 text-[13px] font-medium border-b-2 inline-flex items-center gap-2 transition-colors ${
                  isActive
                    ? 'border-stone-900 text-stone-900 bg-white font-semibold'
                    : 'border-transparent text-stone-500 hover:text-stone-900 hover:border-stone-300'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => window.print()}
          className="h-[36px] min-h-[36px] !min-h-0 px-3.5 text-[13px] font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors inline-flex items-center gap-1.5 shrink-0 cursor-pointer self-end sm:self-auto mb-1"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Print Report</span>
        </button>
      </div>

      {/* REPORT CONTENT 1: Branch Directory */}
      {activeReport === 'branch_directory' && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-lg">
            <div className="text-[13px] text-slate-600 dark:text-slate-400">
              Listing of all registered branches across the healthcare network.
            </div>
            <button
              onClick={handleExportBranchDirectory}
              className="h-[36px] min-h-[36px] !min-h-0 px-3.5 text-[13px] font-medium bg-teal-600 hover:bg-teal-700 text-white transition-colors inline-flex items-center gap-1.5 rounded-lg cursor-pointer shrink-0 shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>

          <Table pinLeading={true}>
            <TableHeader>
              <TableRow>
                <TableHead pinned>Code</TableHead>
                <TableHead>Branch name</TableHead>
                <TableHead>Branch type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Onboarding</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Contact email</TableHead>
                <TableHead>Registered</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clinics.map(c => (
                <TableRow key={c.id}>
                  <TableCell pinned isPrimary className="font-mono font-medium text-[14px] text-slate-900 dark:text-slate-100">{c.code}</TableCell>
                  <TableCell className="font-medium text-[14px] text-slate-900 dark:text-slate-100">{c.name}</TableCell>
                  <TableCell className="text-[14px] text-slate-600 dark:text-slate-400">{formatBranchType(c.branchType)}</TableCell>
                  <TableCell>
                    <StatusDot status={c.status} />
                  </TableCell>
                  <TableCell className="text-[14px] capitalize text-slate-600 dark:text-slate-400">{c.onboardingStatus.replace(/_/g, ' ')}</TableCell>
                  <TableCell className="text-[14px] text-slate-600 dark:text-slate-400">{c.city ? `${c.city}, ${c.state}` : '—'}</TableCell>
                  <TableCell className="text-slate-600 dark:text-slate-400 font-mono text-[12px]">{c.email || '—'}</TableCell>
                  <TableCell className="font-mono text-[12px] text-slate-500">{c.createdAt.slice(0, 10)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* REPORT CONTENT 2: Admin Assignments */}
      {activeReport === 'admin_assignment' && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-lg">
            <div className="text-xs text-slate-600 dark:text-slate-400">
              Primary administrative personnel appointed to oversee local clinic branches.
            </div>
            <button
              onClick={handleExportAdminAssignment}
              className="h-[36px] min-h-[36px] !min-h-0 px-3.5 text-[13px] font-medium bg-teal-600 hover:bg-teal-700 text-white transition-colors inline-flex items-center gap-1.5 rounded-lg cursor-pointer shrink-0 shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>

          <Table pinLeading={true}>
            <TableHeader>
              <TableRow>
                <TableHead pinned>Clinic branch</TableHead>
                <TableHead>Admin name</TableHead>
                <TableHead>Designation</TableHead>
                <TableHead>Email address</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Account status</TableHead>
                <TableHead>Effective from</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {admins.map(a => {
                const clinic = clinics.find(c => c.id === a.clinicId);
                return (
                  <TableRow key={a.id}>
                    <TableCell pinned isPrimary className="font-medium text-[14px] text-slate-900 dark:text-slate-100">
                      {clinic?.name || 'Unassigned'} <span className="font-mono text-[12px] text-slate-400">[{clinic?.code}]</span>
                    </TableCell>
                    <TableCell className="font-medium text-[14px] text-slate-900 dark:text-slate-100">{a.adminName}</TableCell>
                    <TableCell className="text-[14px] text-slate-600 dark:text-slate-400">{a.designation}</TableCell>
                    <TableCell className="font-mono text-[14px] text-slate-600 dark:text-slate-400">{a.adminEmail}</TableCell>
                    <TableCell className="font-mono text-[14px] text-slate-600 dark:text-slate-400">{a.adminPhone || '—'}</TableCell>
                    <TableCell>
                      <StatusDot status={a.status} />
                    </TableCell>
                    <TableCell className="font-mono text-[12px] text-slate-500">{a.effectiveFrom}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* REPORT CONTENT 3: Agreement Expiry & Renewals */}
      {activeReport === 'agreement_expiry' && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-lg">
            <div className="text-[13px] text-slate-600 dark:text-slate-400">
              Contractual validity audit, pending renewals, and expiration notice schedules.
            </div>
            <button
              onClick={handleExportAgreements}
              className="h-[36px] min-h-[36px] !min-h-0 px-3.5 text-[13px] font-medium bg-teal-600 hover:bg-teal-700 text-white transition-colors inline-flex items-center gap-1.5 rounded-lg cursor-pointer shrink-0 shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>

          <Table pinLeading={true}>
            <TableHeader>
              <TableRow>
                <TableHead pinned>Agreement reference</TableHead>
                <TableHead>Clinic branch</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Valid from</TableHead>
                <TableHead>Valid to</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Covered wings</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agreements.map(a => (
                <TableRow key={a.id}>
                  <TableCell pinned isPrimary className="font-mono font-medium text-[14px] text-slate-900 dark:text-slate-100">{a.agreementReference}</TableCell>
                  <TableCell className="font-medium text-[14px] text-slate-900 dark:text-slate-100">{a.clinicName}</TableCell>
                  <TableCell className="capitalize text-[14px] text-slate-600 dark:text-slate-400">{a.agreementType.replace(/_/g, ' ')}</TableCell>
                  <TableCell className="font-mono text-[14px] text-slate-600 dark:text-slate-400">{a.startDate}</TableCell>
                  <TableCell className="font-mono text-[14px] text-slate-900 dark:text-slate-100 font-medium">{a.endDate}</TableCell>
                  <TableCell>
                    <StatusDot status={a.status} />
                  </TableCell>
                  <TableCell className="text-slate-600 dark:text-slate-400 text-[12px]">
                    {a.coveredFacilities.slice(0, 4).join(', ')}
                    {a.coveredFacilities.length > 4 ? ` +${a.coveredFacilities.length - 4}` : ''}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* REPORT CONTENT 4: Facility Adoption Matrix */}
      {activeReport === 'facility_adoption' && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-lg">
            <div className="text-[13px] text-slate-600 dark:text-slate-400">
              Cross-network adoption summary across all platform clinical and diagnostic wings.
            </div>
            <button
              onClick={handleExportFacilityAdoption}
              className="h-[36px] min-h-[36px] !min-h-0 px-3.5 text-[13px] font-medium bg-teal-600 hover:bg-teal-700 text-white transition-colors inline-flex items-center gap-1.5 rounded-lg cursor-pointer shrink-0 shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>

          <Table pinLeading={true}>
            <TableHeader>
              <TableRow>
                <TableHead pinned>Facility code</TableHead>
                <TableHead>Display name</TableHead>
                <TableHead className="text-center">1. Opted for</TableHead>
                <TableHead className="text-center">2. Entitled</TableHead>
                <TableHead className="text-center">3. CMS enabled</TableHead>
                <TableHead className="text-center">4. Op. configured</TableHead>
                <TableHead className="text-right">Adoption rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {facilities.map(f => {
                const opted = clinics.filter(c => (c.optedFacilities || []).includes(f.code)).length;
                const entitled = clinics.filter(c => (c.entitledFacilities || []).includes(f.code)).length;
                const enabled = clinics.filter(c => (c.enabledModules || []).includes(f.code)).length;
                const configured = enabled;
                const rate = clinics.length > 0 ? Math.round((enabled / clinics.length) * 100) : 0;

                return (
                  <TableRow key={f.id}>
                    <TableCell pinned isPrimary className="font-mono font-semibold text-[14px] text-slate-900 dark:text-slate-100">{f.code}</TableCell>
                    <TableCell className="font-medium text-[14px] text-slate-900 dark:text-slate-100">{f.name}</TableCell>
                    <TableCell className="text-center font-mono text-[14px] text-slate-700 dark:text-slate-300">{opted}</TableCell>
                    <TableCell className="text-center font-mono text-[14px] text-slate-700 dark:text-slate-300">{entitled}</TableCell>
                    <TableCell className="text-center font-mono font-semibold text-[14px] text-slate-900 dark:text-slate-100">{enabled}</TableCell>
                    <TableCell className="text-center font-mono text-[14px] text-slate-700 dark:text-slate-300">{configured}</TableCell>
                    <TableCell className="text-right font-mono font-medium text-[14px] text-slate-900 dark:text-slate-100">{rate}%</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* REPORT CONTENT 5: Onboarding Audit Trail */}
      {activeReport === 'onboarding_audit' && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-lg">
            <div className="text-[13px] text-slate-600 dark:text-slate-400">
              Audit log of 10-point onboarding compliance and authorized executive overrides.
            </div>
            <button
              onClick={handleExportOnboardingAudit}
              className="h-[36px] min-h-[36px] !min-h-0 px-3.5 text-[13px] font-medium bg-teal-600 hover:bg-teal-700 text-white transition-colors inline-flex items-center gap-1.5 rounded-lg cursor-pointer shrink-0 shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>

          <Table pinLeading={true}>
            <TableHeader>
              <TableRow>
                <TableHead pinned>Clinic branch</TableHead>
                <TableHead>Checklist item</TableHead>
                <TableHead>Mandatory</TableHead>
                <TableHead>Compliance status</TableHead>
                <TableHead>Override reason / audit reference</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clinics.flatMap(clinic => {
                const items = onboarding.filter(i => i.clinicId === clinic.id);
                return items.map(item => (
                  <TableRow key={item.id}>
                    <TableCell pinned isPrimary className="font-medium text-[14px] text-slate-900 dark:text-slate-100">
                      {clinic.name} <span className="font-mono text-[12px] text-slate-400">[{clinic.code}]</span>
                    </TableCell>
                    <TableCell className="font-medium text-[14px] text-slate-900 dark:text-slate-100">{item.title}</TableCell>
                    <TableCell className="font-mono text-[14px] text-slate-500">{item.isMandatory ? 'YES' : 'NO'}</TableCell>
                    <TableCell>
                      <StatusDot
                        status={item.completed ? 'completed' : item.isOverridden ? 'active' : 'pending'}
                        label={item.completed ? 'Completed' : item.isOverridden ? 'Overridden' : 'Pending'}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-[12px] text-slate-600 dark:text-slate-400">
                      {item.overrideReason || (item.completedAt ? `Completed on ${item.completedAt}` : '—')}
                    </TableCell>
                  </TableRow>
                ));
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};
