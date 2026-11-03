import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useClinic } from '@/context/ClinicContext';
import { Building2, ChevronDown, Check, Plus, Lock, MapPin } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

export const ClinicSwitcher: React.FC = () => {
  const { currentRole } = useAuth();
  const { clinics, currentClinic, activeClinicId, switchClinic, createClinic } = useClinic();

  const [isOpen, setIsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New clinic form state
  const [newClinicName, setNewClinicName] = useState('');
  const [newClinicCode, setNewClinicCode] = useState('');
  const [newClinicPhone, setNewClinicPhone] = useState('');
  const [newClinicCity, setNewClinicCity] = useState('');
  const [newClinicAddress, setNewClinicAddress] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Auto-generate clinic code when name changes if code hasn't been manually customized
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNewClinicName(val);
    if (!newClinicCode || newClinicCode === newClinicName.slice(0, 8).toUpperCase().replace(/[^A-Z0-9]/g, '')) {
      const autoCode = val.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
      setNewClinicCode(autoCode);
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
    setErrorMessage('');
    setIsModalOpen(true);
  };

  const handleCreateClinic = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const trimmedName = newClinicName.trim();
    const trimmedCode = newClinicCode.trim().toUpperCase();

    if (!trimmedName) {
      setErrorMessage('Clinic name is required.');
      return;
    }

    if (!trimmedCode) {
      setErrorMessage('Clinic code is required.');
      return;
    }

    // Check code uniqueness
    const codeExists = clinics.some((c) => c.code.toUpperCase() === trimmedCode);
    if (codeExists) {
      setErrorMessage(`Clinic code "${trimmedCode}" is already in use.`);
      return;
    }

    try {
      setIsSubmitting(true);
      const created = await createClinic({
        name: trimmedName,
        code: trimmedCode,
        phone: newClinicPhone.trim() || undefined,
        city: newClinicCity.trim() || undefined,
        address: newClinicAddress.trim() || undefined,
      });

      await switchClinic(created.id);
      setIsModalOpen(false);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to onboard new clinic.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isPlatformSuperAdmin = currentRole === 'platform_super_admin';

  // For non-Platform Super Admins: read-only tenant badge locked to their clinic
  if (!isPlatformSuperAdmin) {
    return (
      <div
        className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg bg-white/10 text-white text-xs font-medium border border-white/15 select-none"
        title={`Active Clinic Tenant: ${currentClinic.name} (${currentClinic.code})`}
      >
        <Building2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        <span className="max-w-[120px] sm:max-w-[180px] truncate">{currentClinic.name}</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/20 text-emerald-200 uppercase font-bold tracking-wide">
          {currentClinic.code}
        </span>
        <span title="Clinic Locked to User Assignment" className="flex items-center">
          <Lock className="w-3 h-3 text-slate-300 ml-0.5 shrink-0" />
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
          className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg bg-emerald-600/90 hover:bg-emerald-600 text-white text-xs font-medium shadow-sm transition-colors border border-emerald-500/40 cursor-pointer"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          title="Switch Active Clinic Tenant"
        >
          <Building2 className="w-3.5 h-3.5 text-white shrink-0" />
          <span className="max-w-[120px] sm:max-w-[180px] truncate">{currentClinic.name}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-800/80 text-emerald-100 uppercase font-bold tracking-wide">
            {currentClinic.code}
          </span>
          <ChevronDown
            className={`w-3.5 h-3.5 text-emerald-100 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {isOpen && (
          <div className="absolute left-0 mt-2 w-72 sm:w-80 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 p-2 z-50 animate-fadeIn text-slate-800 dark:text-slate-200">
            <div className="flex items-center justify-between px-2 py-1.5 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                Clinic Switcher
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                {clinics.length} {clinics.length === 1 ? 'Clinic' : 'Clinics'}
              </span>
            </div>

            <div className="max-h-60 overflow-y-auto py-1 space-y-1">
              {clinics.map((clinic) => {
                const isActive = clinic.id === activeClinicId;
                return (
                  <button
                    key={clinic.id}
                    type="button"
                    onClick={() => handleSelectClinic(clinic.id)}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60'
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
                      {clinic.city && (
                        <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span className="truncate">{clinic.city}{clinic.state ? `, ${clinic.state}` : ''}</span>
                        </div>
                      )}
                    </div>
                    {isActive && (
                      <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 mt-1">
              <button
                type="button"
                onClick={handleOpenModal}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors cursor-pointer"
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
        title="Onboard New Clinic Tenant"
        description="Provision a new clinic tenant in the multi-clinic network. Data will be isolated by clinic ID."
        maxWidth="md"
      >
        <form onSubmit={handleCreateClinic} className="space-y-4">
          {errorMessage && (
            <div className="p-3 text-xs bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 rounded-lg">
              {errorMessage}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Clinic Name *
            </label>
            <input
              type="text"
              required
              value={newClinicName}
              onChange={handleNameChange}
              placeholder="e.g. Apex Health Center"
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Clinic Code * (Unique alphanumeric identifier)
            </label>
            <input
              type="text"
              required
              value={newClinicCode}
              onChange={(e) => setNewClinicCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10))}
              placeholder="e.g. APEX"
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono uppercase"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                City
              </label>
              <input
                type="text"
                value={newClinicCity}
                onChange={(e) => setNewClinicCity(e.target.value)}
                placeholder="e.g. Pune"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Phone
              </label>
              <input
                type="text"
                value={newClinicPhone}
                onChange={(e) => setNewClinicPhone(e.target.value)}
                placeholder="e.g. +91 98200 12345"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
              placeholder="e.g. Plot 42, Senapati Bapat Road"
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
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
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isSubmitting ? 'Provisioning...' : 'Provision Clinic'}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
};
