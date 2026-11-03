import React, { useState } from 'react';
import {
  Download,
  Printer,
  Building2,
  Users,
  ShieldCheck,
  Layers,
  ClipboardList,
} from 'lucide-react';
import { useSuperAdmin } from '../../context/SuperAdminContext';

type ReportType =
  | 'branch_directory'
  | 'admin_assignment'
  | 'agreement_expiry'
  | 'facility_adoption'
  | 'onboarding_audit';

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
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200 pb-5">
        <div>
          <div className="text-xs font-mono uppercase tracking-wider text-stone-500 mb-1">
            Governance & Executive Intelligence
          </div>
          <h1 className="text-2xl font-semibold text-stone-900 tracking-tight">
            Administrative Reports & Overview
          </h1>
          <p className="text-sm text-stone-600 mt-1">
            Standardized operational data exports. Strictly administrative oversight with zero patient or financial data.
          </p>
        </div>

        {/* Global Print & Export Control */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="px-3 py-1.5 text-xs border border-stone-200 text-stone-700 bg-white hover:bg-stone-50 transition-colors inline-flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Report
          </button>
        </div>
      </div>

      {/* Report Switcher Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-stone-200 pb-px">
        {[
          { key: 'branch_directory', label: '1. Branch Directory', icon: Building2 },
          { key: 'admin_assignment', label: '2. Admin Assignments', icon: Users },
          { key: 'agreement_expiry', label: '3. Agreement Expiry & Renewals', icon: ShieldCheck },
          { key: 'facility_adoption', label: '4. Facility Adoption Matrix', icon: Layers },
          { key: 'onboarding_audit', label: '5. Onboarding Audit Trail', icon: ClipboardList },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeReport === tab.key;

          return (
            <button
              key={tab.key}
              onClick={() => setActiveReport(tab.key as ReportType)}
              className={`px-3.5 py-2 text-xs font-medium border-b-2 inline-flex items-center gap-2 transition-colors ${
                isActive
                  ? 'border-stone-900 text-stone-900 bg-white'
                  : 'border-transparent text-stone-500 hover:text-stone-900 hover:border-stone-300'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* REPORT CONTENT 1: Branch Directory */}
      {activeReport === 'branch_directory' && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white border border-stone-200 p-3">
            <div className="text-xs text-stone-600">
              Listing of all registered branches across the healthcare network.
            </div>
            <button
              onClick={handleExportBranchDirectory}
              className="px-3 py-1.5 text-xs font-medium bg-stone-900 text-white hover:bg-stone-800 transition-colors inline-flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
          </div>

          <div className="border border-stone-200 bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-stone-200 bg-stone-50 text-stone-600 font-mono text-[11px]">
                    <th className="py-2 px-3">Code</th>
                    <th className="py-2 px-3">Branch Name</th>
                    <th className="py-2 px-3">Type</th>
                    <th className="py-2 px-3">Status</th>
                    <th className="py-2 px-3">Onboarding</th>
                    <th className="py-2 px-3">Location</th>
                    <th className="py-2 px-3">Contact Email</th>
                    <th className="py-2 px-3 font-mono">Registered</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {clinics.map(c => (
                    <tr key={c.id} className="hover:bg-stone-50">
                      <td className="py-2.5 px-3 font-mono font-medium text-stone-900">{c.code}</td>
                      <td className="py-2.5 px-3 font-medium text-stone-900">{c.name}</td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-stone-600">{c.branchType.toUpperCase()}</td>
                      <td className="py-2.5 px-3">
                        <span className={`inline-block px-1.5 py-0.5 text-[10px] font-mono border ${
                          c.status === 'active'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                            : 'border-amber-200 bg-amber-50 text-amber-800'
                        }`}>
                          {c.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-stone-600">{c.onboardingStatus.replace(/_/g, ' ')}</td>
                      <td className="py-2.5 px-3 text-stone-600">{c.city ? `${c.city}, ${c.state}` : '—'}</td>
                      <td className="py-2.5 px-3 text-stone-600 font-mono text-[11px]">{c.email || '—'}</td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-stone-500">{c.createdAt.slice(0, 10)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* REPORT CONTENT 2: Admin Assignments */}
      {activeReport === 'admin_assignment' && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white border border-stone-200 p-3">
            <div className="text-xs text-stone-600">
              Primary administrative personnel appointed to oversee local clinic branches.
            </div>
            <button
              onClick={handleExportAdminAssignment}
              className="px-3 py-1.5 text-xs font-medium bg-stone-900 text-white hover:bg-stone-800 transition-colors inline-flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
          </div>

          <div className="border border-stone-200 bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-stone-200 bg-stone-50 text-stone-600 font-mono text-[11px]">
                    <th className="py-2 px-3">Clinic Branch</th>
                    <th className="py-2 px-3">Admin Name</th>
                    <th className="py-2 px-3">Designation</th>
                    <th className="py-2 px-3">Email Address</th>
                    <th className="py-2 px-3">Phone</th>
                    <th className="py-2 px-3">Account Status</th>
                    <th className="py-2 px-3 font-mono">Effective From</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {admins.map(a => {
                    const clinic = clinics.find(c => c.id === a.clinicId);
                    return (
                      <tr key={a.id} className="hover:bg-stone-50">
                        <td className="py-2.5 px-3 font-medium text-stone-900">
                          {clinic?.name || 'Unassigned'} <span className="font-mono text-stone-400">[{clinic?.code}]</span>
                        </td>
                        <td className="py-2.5 px-3 font-medium text-stone-900">{a.adminName}</td>
                        <td className="py-2.5 px-3 text-stone-600">{a.designation}</td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-stone-600">{a.adminEmail}</td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-stone-600">{a.adminPhone || '—'}</td>
                        <td className="py-2.5 px-3">
                          <span className={`inline-block px-1.5 py-0.5 text-[10px] font-mono border ${
                            a.status === 'active'
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                              : 'border-stone-200 bg-stone-50 text-stone-600'
                          }`}>
                            {a.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-stone-500">{a.effectiveFrom}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* REPORT CONTENT 3: Agreement Expiry & Renewals */}
      {activeReport === 'agreement_expiry' && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white border border-stone-200 p-3">
            <div className="text-xs text-stone-600">
              Contractual validity audit, pending renewals, and expiration notice schedules.
            </div>
            <button
              onClick={handleExportAgreements}
              className="px-3 py-1.5 text-xs font-medium bg-stone-900 text-white hover:bg-stone-800 transition-colors inline-flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
          </div>

          <div className="border border-stone-200 bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-stone-200 bg-stone-50 text-stone-600 font-mono text-[11px]">
                    <th className="py-2 px-3">Agreement Reference</th>
                    <th className="py-2 px-3">Clinic Branch</th>
                    <th className="py-2 px-3">Type</th>
                    <th className="py-2 px-3 font-mono">Valid From</th>
                    <th className="py-2 px-3 font-mono">Valid To</th>
                    <th className="py-2 px-3">Status</th>
                    <th className="py-2 px-3">Covered Wings</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {agreements.map(a => (
                    <tr key={a.id} className="hover:bg-stone-50">
                      <td className="py-2.5 px-3 font-mono font-medium text-stone-900">{a.agreementReference}</td>
                      <td className="py-2.5 px-3 font-medium text-stone-900">{a.clinicName}</td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-stone-600">{a.agreementType.replace(/_/g, ' ').toUpperCase()}</td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-stone-600">{a.startDate}</td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-stone-900 font-medium">{a.endDate}</td>
                      <td className="py-2.5 px-3">
                        <span className={`inline-block px-1.5 py-0.5 text-[10px] font-mono border ${
                          a.status === 'active'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                            : a.status === 'expiring_soon'
                            ? 'border-amber-200 bg-amber-50 text-amber-800'
                            : 'border-stone-200 bg-stone-50 text-stone-600'
                        }`}>
                          {a.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-stone-600 text-[11px]">
                        {a.coveredFacilities.slice(0, 4).join(', ')}
                        {a.coveredFacilities.length > 4 ? ` +${a.coveredFacilities.length - 4}` : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* REPORT CONTENT 4: Facility Adoption Matrix */}
      {activeReport === 'facility_adoption' && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white border border-stone-200 p-3">
            <div className="text-xs text-stone-600">
              Cross-network adoption summary across all platform clinical and diagnostic wings.
            </div>
            <button
              onClick={handleExportFacilityAdoption}
              className="px-3 py-1.5 text-xs font-medium bg-stone-900 text-white hover:bg-stone-800 transition-colors inline-flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
          </div>

          <div className="border border-stone-200 bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-stone-200 bg-stone-50 text-stone-600 font-mono text-[11px]">
                    <th className="py-2 px-3">Facility Code</th>
                    <th className="py-2 px-3">Display Name</th>
                    <th className="py-2 px-3 text-center">1. Opted For</th>
                    <th className="py-2 px-3 text-center">2. Entitled</th>
                    <th className="py-2 px-3 text-center">3. CMS Enabled</th>
                    <th className="py-2 px-3 text-center">4. Op. Configured</th>
                    <th className="py-2 px-3 font-mono text-right">Adoption Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {facilities.map(f => {
                    const opted = clinics.filter(c => (c.optedFacilities || []).includes(f.code)).length;
                    const entitled = clinics.filter(c => (c.entitledFacilities || []).includes(f.code)).length;
                    const enabled = clinics.filter(c => (c.enabledModules || []).includes(f.code)).length;
                    const configured = enabled;
                    const rate = clinics.length > 0 ? Math.round((enabled / clinics.length) * 100) : 0;

                    return (
                      <tr key={f.id} className="hover:bg-stone-50">
                        <td className="py-2.5 px-3 font-mono font-semibold text-stone-900">{f.code}</td>
                        <td className="py-2.5 px-3 font-medium text-stone-900">{f.name}</td>
                        <td className="py-2.5 px-3 text-center font-mono text-stone-700">{opted}</td>
                        <td className="py-2.5 px-3 text-center font-mono text-stone-700">{entitled}</td>
                        <td className="py-2.5 px-3 text-center font-mono font-semibold text-stone-900">{enabled}</td>
                        <td className="py-2.5 px-3 text-center font-mono text-stone-700">{configured}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-medium text-stone-900">{rate}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* REPORT CONTENT 5: Onboarding Audit Trail */}
      {activeReport === 'onboarding_audit' && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white border border-stone-200 p-3">
            <div className="text-xs text-stone-600">
              Audit log of 10-point onboarding compliance and authorized executive overrides.
            </div>
            <button
              onClick={handleExportOnboardingAudit}
              className="px-3 py-1.5 text-xs font-medium bg-stone-900 text-white hover:bg-stone-800 transition-colors inline-flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
          </div>

          <div className="border border-stone-200 bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-stone-200 bg-stone-50 text-stone-600 font-mono text-[11px]">
                    <th className="py-2 px-3">Clinic Branch</th>
                    <th className="py-2 px-3">Checklist Item</th>
                    <th className="py-2 px-3">Mandatory</th>
                    <th className="py-2 px-3">Compliance Status</th>
                    <th className="py-2 px-3">Override Reason / Audit Reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {clinics.flatMap(clinic => {
                    const items = onboarding.filter(i => i.clinicId === clinic.id);
                    return items.map(item => (
                      <tr key={item.id} className="hover:bg-stone-50">
                        <td className="py-2 px-3 font-medium text-stone-900">
                          {clinic.name} <span className="font-mono text-stone-400">[{clinic.code}]</span>
                        </td>
                        <td className="py-2 px-3 font-medium text-stone-900">{item.title}</td>
                        <td className="py-2 px-3 font-mono text-stone-500">{item.isMandatory ? 'YES' : 'NO'}</td>
                        <td className="py-2 px-3">
                          {item.completed ? (
                            <span className="inline-block px-1.5 py-0.5 text-[10px] font-mono border border-emerald-200 bg-emerald-50 text-emerald-800">
                              COMPLETED
                            </span>
                          ) : item.isOverridden ? (
                            <span className="inline-block px-1.5 py-0.5 text-[10px] font-mono border border-amber-300 bg-amber-50 text-amber-800">
                              OVERRIDDEN
                            </span>
                          ) : (
                            <span className="inline-block px-1.5 py-0.5 text-[10px] font-mono border border-stone-200 bg-stone-50 text-stone-600">
                              PENDING
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 font-mono text-[11px] text-stone-600">
                          {item.overrideReason || (item.completedAt ? `Completed on ${item.completedAt}` : '—')}
                        </td>
                      </tr>
                    ));
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
