import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useClinic } from '@/context/ClinicContext';
import {
  Building2,
  ChevronDown,
  Check,
  Plus,
  Lock,
  Eye,
  EyeOff,
  Copy,
  CheckCircle2,
  User,
  Shield,
  KeyRound,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Clinic, ProvisionedAdminInfo } from '@/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { getRepository } from '@/data/storage';
import { Account } from '@/types/storage';

export const ClinicSwitcher: React.FC = () => {
  const { currentRole } = useAuth();
  const { clinics, currentClinic, activeClinicId, switchClinic, createClinic, organizations } = useClinic();

  const [isOpen, setIsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New clinic form state
  const [selectedOrgId, setSelectedOrgId] = useState<string>('ORG-001');
  const [newClinicName, setNewClinicName] = useState('');
  const [newClinicCode, setNewClinicCode] = useState('');
  const [newClinicPhone, setNewClinicPhone] = useState('');
  const [newClinicCity, setNewClinicCity] = useState('');
  const [newClinicAddress, setNewClinicAddress] = useState('');

  // Initial Administrator form state
  const [adminFullName, setAdminFullName] = useState('');
  const [adminUsername, setAdminUsername] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('Admin@12345');
  const [showPassword, setShowPassword] = useState(false);

  // Status & Success state
  const [errorMessage, setErrorMessage] = useState('');
  const [provisionResult, setProvisionResult] = useState<{
    clinic: Clinic;
    adminAccount?: ProvisionedAdminInfo;
  } | null>(null);
  const [hasCopied, setHasCopied] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Auto-generate code and admin fields when clinic name changes
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNewClinicName(val);

    const autoCode = val.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
    if (!newClinicCode || newClinicCode === newClinicName.slice(0, 8).toUpperCase().replace(/[^A-Z0-9]/g, '')) {
      setNewClinicCode(autoCode);
    }

    if (!adminFullName || adminFullName === `${newClinicName} Administrator`) {
      setAdminFullName(val ? `${val} Administrator` : '');
    }

    const codeLower = autoCode.toLowerCase();
    if (codeLower && (!adminUsername || adminUsername.endsWith('_admin'))) {
      setAdminUsername(`${codeLower}_admin`);
    }

    if (codeLower && (!adminEmail || adminEmail.startsWith('admin@'))) {
      setAdminEmail(`admin@${codeLower}.local`);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
    setNewClinicCode(raw);
    const codeLower = raw.toLowerCase();
    if (codeLower) {
      setAdminUsername(`${codeLower}_admin`);
      setAdminEmail(`admin@${codeLower}.local`);
    }
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelectClinic = async (clinicId: string) => {
    if (clinicId === activeClinicId) {
      setIsOpen(false);
      return;
    }
    setIsOpen(false);
    await switchClinic(clinicId);
  };

  const handleOpenModal = () => {
    setIsOpen(false);
    setNewClinicName('');
    setNewClinicCode('');
    setNewClinicPhone('');
    setNewClinicCity('');
    setNewClinicAddress('');
    setAdminFullName('');
    setAdminUsername('');
    setAdminEmail('');
    setAdminPassword('Admin@12345');
    setShowPassword(false);
    setErrorMessage('');
    setProvisionResult(null);
    setHasCopied(false);
    setIsModalOpen(true);
  };

  const handleCreateClinic = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const trimmedName = newClinicName.trim();
    const trimmedCode = newClinicCode.trim().toUpperCase();
    const trimmedAdminUsername = adminUsername.trim().toLowerCase();
    const trimmedAdminPass = adminPassword.trim();
    const trimmedAdminName = adminFullName.trim();
    const trimmedAdminEmail = adminEmail.trim().toLowerCase();

    if (!trimmedName) {
      setErrorMessage('Clinic name is required.');
      return;
    }

    if (!trimmedCode) {
      setErrorMessage('Clinic code is required.');
      return;
    }

    if (!trimmedAdminUsername) {
      setErrorMessage('Administrator username is required.');
      return;
    }

    if (!trimmedAdminPass || trimmedAdminPass.length < 8) {
      setErrorMessage('Administrator password must be at least 8 characters.');
      return;
    }

    // Check code uniqueness
    const codeExists = clinics.some((c) => c.code.toUpperCase() === trimmedCode);
    if (codeExists) {
      setErrorMessage(`Clinic code "${trimmedCode}" is already in use.`);
      return;
    }

    // Check username uniqueness
    try {
      if (isSupabaseConfigured && supabase) {
        const { data: existingUser } = await supabase
          .from('accounts')
          .select('id')
          .eq('username', trimmedAdminUsername)
          .maybeSingle();

        if (existingUser) {
          setErrorMessage(`Username "${trimmedAdminUsername}" is already taken. Please choose another.`);
          return;
        }
      } else {
        const repo = getRepository<Account>('accounts');
        const allAccs = await repo.list();
        if (allAccs.some((a) => a.username.toLowerCase() === trimmedAdminUsername)) {
          setErrorMessage(`Username "${trimmedAdminUsername}" is already taken. Please choose another.`);
          return;
        }
      }
    } catch {
      // Proceed if check fails
    }

    try {
      setIsSubmitting(true);
      const result = await createClinic({
        name: trimmedName,
        code: trimmedCode,
        organizationId: selectedOrgId || undefined,
        phone: newClinicPhone.trim() || undefined,
        city: newClinicCity.trim() || undefined,
        address: newClinicAddress.trim() || undefined,
        adminFullName: trimmedAdminName || `${trimmedName} Administrator`,
        adminUsername: trimmedAdminUsername,
        adminEmail: trimmedAdminEmail || `admin@${trimmedCode.toLowerCase()}.local`,
        adminPassword: trimmedAdminPass,
        adminPhone: newClinicPhone.trim() || undefined,
      });

      // Show the provisioned credentials summary
      setProvisionResult({
        clinic: result,
        adminAccount: result.adminAccount,
      });
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to onboard new clinic.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyCredentials = () => {
    if (!provisionResult?.adminAccount) return;
    const credText = [
      `Hospital: ${provisionResult.clinic.name} (${provisionResult.clinic.code})`,
      `Hospital ID: ${provisionResult.clinic.id}`,
      `Role: Clinic Administrator (admin)`,
      `Username: ${provisionResult.adminAccount.username}`,
      `Password: ${provisionResult.adminAccount.temporaryPassword || adminPassword}`,
      `Email: ${provisionResult.adminAccount.email}`,
      `Login URL: ${window.location.origin}/?as=admin`,
    ].join('\n');

    navigator.clipboard.writeText(credText);
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 3000);
  };

  const handleSwitchToProvisioned = async () => {
    if (provisionResult) {
      await switchClinic(provisionResult.clinic.id);
    }
    setIsModalOpen(false);
  };

  const isPlatformSuperAdmin = currentRole === 'platform_super_admin';

  // For non-Platform Super Admins: read-only tenant badge locked to their clinic
  if (!isPlatformSuperAdmin) {
    const parentOrg = organizations.find((o) => o.id === currentClinic.organizationId);
    return (
      <div
        className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium border border-slate-200 dark:border-slate-700 select-none"
        title={`Active Clinic Tenant: ${currentClinic.name} (${currentClinic.code})${parentOrg ? ` • Organization: ${parentOrg.name}` : ''}`}
      >
        <Building2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
        <span className="max-w-[120px] sm:max-w-[180px] truncate">{currentClinic.name}</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 uppercase font-bold tracking-wide font-mono border border-teal-200 dark:border-teal-800">
          {currentClinic.code}
        </span>
        {parentOrg && (
          <span className="hidden md:inline-block text-[10px] px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-slate-700 text-slate-600 dark:text-slate-300 tracking-wide font-mono">
            {parentOrg.code}
          </span>
        )}
        <span title="Clinic Locked to User Assignment" className="flex items-center">
          <Lock className="w-3 h-3 text-slate-400 ml-0.5 shrink-0" />
        </span>
      </div>
    );
  }

  // For Platform Super Admin: interactive switcher dropdown + clinic onboarding
  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium shadow-sm transition-colors border border-teal-700 cursor-pointer"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          title="Switch Active Clinic Tenant"
        >
          <Building2 className="w-3.5 h-3.5 text-white shrink-0" />
          <span className="max-w-[120px] sm:max-w-[180px] truncate">{currentClinic.name}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-800/80 text-teal-100 uppercase font-bold tracking-wide">
            {currentClinic.code}
          </span>
          <ChevronDown
            className={`w-3.5 h-3.5 text-teal-100 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {isOpen && (
          <div className="absolute left-0 mt-2 w-72 sm:w-80 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 p-2 z-50 animate-fadeIn text-slate-800 dark:text-slate-200">
            <div className="flex items-center justify-between px-2 py-1.5 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                Clinic Switcher
              </span>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400">
                {clinics.length} {clinics.length === 1 ? 'Clinic' : 'Clinics'}
              </span>
            </div>

            <div className="max-h-60 overflow-y-auto py-1 space-y-1">
              {clinics.map((clinic) => {
                const isActive = clinic.id === activeClinicId;
                const org = organizations.find((o) => o.id === clinic.organizationId);
                return (
                  <button
                    key={clinic.id}
                    type="button"
                    onClick={() => handleSelectClinic(clinic.id)}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/60'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {clinic.name}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono font-bold shrink-0">
                          {clinic.code}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {org ? (
                          <span className="truncate">{org.name}</span>
                        ) : (
                          <span className="italic text-slate-400">Standalone Branch</span>
                        )}
                        {clinic.city && (
                          <>
                            <span>&bull;</span>
                            <span className="truncate">{clinic.city}</span>
                          </>
                        )}
                      </div>
                    </div>
                    {isActive && (
                      <Check className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 mt-1">
              <button
                type="button"
                onClick={handleOpenModal}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 dark:hover:bg-teal-900/60 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Onboard New Clinic</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Onboard New Clinic Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !isSubmitting && setIsModalOpen(false)}
        title={provisionResult ? 'Hospital Provisioned Successfully' : 'Onboard New Hospital Tenant'}
        description={
          provisionResult
            ? 'The hospital tenant and its initial Clinic Administrator account have been created and isolated.'
            : 'Provision a new hospital and create its initial Clinic Administrator account for localized governance.'
        }
        maxWidth="lg"
      >
        {provisionResult ? (
          /* Success Screen with Provisioned Credentials */
          <div className="space-y-5 animate-fadeIn">
            <div className="p-4 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-bold text-teal-900 dark:text-teal-100 text-sm">
                  {provisionResult.clinic.name} is now active on the platform.
                </p>
                <p className="text-teal-700 dark:text-teal-300">
                  Tenant ID: <span className="font-mono font-bold">{provisionResult.clinic.id}</span> • Code: <span className="font-mono font-bold">{provisionResult.clinic.code}</span>
                </p>
              </div>
            </div>

            {/* Administrator Account Details Card */}
            {provisionResult.adminAccount && (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      Initial Administrator Credentials
                    </span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-semibold">
                    Clinic Admin
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Administrator Name</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {provisionResult.adminAccount.fullName}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Email Address</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                      {provisionResult.adminAccount.email}
                    </span>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                    <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-bold">Username</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-sm">
                      {provisionResult.adminAccount.username}
                    </span>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                    <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-bold">Temporary Password</span>
                    <span className="font-mono font-bold text-teal-600 dark:text-teal-400 text-sm">
                      {provisionResult.adminAccount.temporaryPassword}
                    </span>
                  </div>
                </div>

                <div className="pt-1 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span>Scope: Strictly locked to {provisionResult.clinic.name} ({provisionResult.clinic.code})</span>
                  <button
                    type="button"
                    onClick={handleCopyCredentials}
                    className="flex items-center gap-1 text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300 font-medium cursor-pointer"
                  >
                    {hasCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copied to Clipboard!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Credentials</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsModalOpen(false)}
              >
                Close (Stay in Current Clinic)
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSwitchToProvisioned}
                className="bg-teal-600 hover:bg-teal-700 text-white"
              >
                Switch to {provisionResult.clinic.name} Now
              </Button>
            </div>
          </div>
        ) : (
          /* Onboarding Form */
          <form onSubmit={handleCreateClinic} className="space-y-4">
            {errorMessage && (
              <div className="p-3 text-xs bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 rounded-lg">
                {errorMessage}
              </div>
            )}

            {/* Section 1: Hospital Details */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-1 border-b border-slate-100 dark:border-slate-800">
                <Building2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Hospital & Facility Details
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Hospital Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newClinicName}
                    onChange={handleNameChange}
                    placeholder="e.g. Apex Specialty Hospital"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Code * (Unique)
                  </label>
                  <input
                    type="text"
                    required
                    value={newClinicCode}
                    onChange={handleCodeChange}
                    placeholder="e.g. APEX"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Parent Organization
                  </label>
                  <select
                    value={selectedOrgId}
                    onChange={(e) => setSelectedOrgId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">None (Standalone Hospital)</option>
                    {organizations.map((org) => {
                      const branchCount = clinics.filter((c) => c.organizationId === org.id).length;
                      const maxBranches = org.maxBranches ?? 5;
                      const isFull = branchCount >= maxBranches;
                      return (
                        <option key={org.id} value={org.id} disabled={isFull}>
                          {org.name} ({org.code}) - {branchCount} of {maxBranches} branches {isFull ? '(Quota Reached)' : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    City / Location
                  </label>
                  <input
                    type="text"
                    value={newClinicCity}
                    onChange={(e) => setNewClinicCity(e.target.value)}
                    placeholder="e.g. Boston"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    value={newClinicPhone}
                    onChange={(e) => setNewClinicPhone(e.target.value)}
                    placeholder="e.g. +1 617-555-0199"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  value={newClinicAddress}
                  onChange={(e) => setNewClinicAddress(e.target.value)}
                  placeholder="e.g. 750 Beacon Center Parkway"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            {/* Section 2: Initial Clinic Administrator */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Initial Clinic Administrator Account
                  </h4>
                </div>
                <span className="text-[10px] text-slate-400">
                  Role: Clinic Admin
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 -mt-1">
                This account will hold primary operational authority for this hospital and will be strictly locked to this tenant.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Administrator Full Name *
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      required
                      value={adminFullName}
                      onChange={(e) => setAdminFullName(e.target.value)}
                      placeholder="e.g. Dr. Sarah Jenkins"
                      className="w-full px-3 pr-8 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                    <User className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Admin Username * (For Login)
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      required
                      value={adminUsername}
                      onChange={(e) => setAdminUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                      placeholder="e.g. apex_admin"
                      className="w-full px-3 pr-8 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
                    />
                    <KeyRound className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Admin Official Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="e.g. admin@apexcare.local"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Initial Password *
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="Min 8 characters"
                      className="w-full px-3 pr-8 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 absolute right-2.5 p-0.5 cursor-pointer"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsModalOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting}
                className="bg-teal-600 hover:bg-teal-700 text-white"
              >
                {isSubmitting ? 'Provisioning Hospital...' : 'Provision Hospital & Administrator'}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
};
