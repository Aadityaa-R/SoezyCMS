import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import {
  Gauge,
  Building2,
  UserCheck,
  FileText,
  MessageSquare,
  FileCode2,
  Printer,
  MessagesSquare,
  Percent,
  UserPlus,
  CreditCard,
  ShieldCheck,
  Users,
  Package,
  Wallet,
  Coins,
  Settings,
  KeyRound,
  CheckCircle2,
  Send,
} from 'lucide-react';

interface GetStartedViewProps {
  onNavigate?: (tab: string, subTab?: string) => void;
}

interface TileItem {
  id: string;
  title: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
}

export const GetStartedView: React.FC<GetStartedViewProps> = ({ onNavigate }) => {
  // Modal states for settings tiles
  const [activeModal, setActiveModal] = useState<string | null>(null);

  // Form states for modals
  const [clinicName, setClinicName] = useState('SUBIKSHAM SPECIALITY HOSPITAL');
  const [clinicAddress, setClinicAddress] = useState('Melur Main Road, Y, Otthakadai, Madurai, Tamil Nadu, India');
  const [clinicPhone, setClinicPhone] = useState('+91 9543279999');
  const [smsPrefix, setSmsPrefix] = useState('SOEZY');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    if (!newPassword || newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }
    setPasswordSuccess(true);
    setTimeout(() => {
      setPasswordSuccess(false);
      setActiveModal(null);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }, 1500);
  };

  // 18 Tiles organized exactly as in SOEZY: 3 rows × 6 columns
  const tiles: TileItem[] = [
    // --- ROW 1 ---
    {
      id: 'dashboard',
      title: 'Dashboard',
      desc: 'All your clinic analytics in one view',
      icon: Gauge,
      onClick: () => onNavigate?.('dashboard'),
    },
    {
      id: 'clinic-details',
      title: 'Clinic Details',
      desc: 'Update information about your clinic. Information will be appear on all searches',
      icon: Building2,
      onClick: () => setActiveModal('clinic-details'),
    },
    {
      id: 'profile-settings',
      title: 'Profile Settings',
      desc: 'Update your personal information. Information will be appear on all searches',
      icon: UserCheck,
      onClick: () => onNavigate?.('profile'),
    },
    {
      id: 'emr-settings',
      title: 'EMR Settings',
      desc: 'Add all consultation notes, templates to be available during consultation',
      icon: FileText,
      onClick: () => setActiveModal('emr-settings'),
    },
    {
      id: 'sms-settings',
      title: 'SMS settings',
      desc: 'Configure all SMS templates',
      icon: MessageSquare,
      onClick: () => setActiveModal('sms-settings'),
    },
    {
      id: 'master-templates',
      title: 'Master templates',
      desc: 'Pre-configure your prescription, notes, lab test and treatments',
      icon: FileCode2,
      onClick: () => setActiveModal('master-templates'),
    },

    // --- ROW 2 ---
    {
      id: 'print-settings',
      title: 'Print Settings',
      desc: 'Configure your summary, billing and prescription prints',
      icon: Printer,
      onClick: () => setActiveModal('print-settings'),
    },
    {
      id: 'communication',
      title: 'Communication',
      desc: 'Send bulk SMS, Emails to your patients. Create SMS & Email groups',
      icon: MessagesSquare,
      onClick: () => setActiveModal('communication'),
    },
    {
      id: 'loyalty',
      title: 'Loyalty',
      desc: 'Configure offers & membership to be made available to your patients',
      icon: Percent,
      onClick: () => setActiveModal('loyalty'),
    },
    {
      id: 'add-consultant',
      title: 'Add Consultant',
      desc: 'Create, Edit, Delete your clinic consultants. Assign temporary access to EMR settings',
      icon: UserPlus,
      onClick: () => setActiveModal('add-consultant'),
    },
    {
      id: 'clinic-id',
      title: 'Clinic id generation',
      desc: "Automatically assign Patient ID's, Invoice ID's, Bill Id's for all your patients",
      icon: CreditCard,
      onClick: () => setActiveModal('clinic-id'),
    },
    {
      id: 'admin',
      title: 'Admin',
      desc: 'Manage branches, manage users, profile settings, page level access for all your clinics',
      icon: ShieldCheck,
      onClick: () => onNavigate?.('access'),
    },

    // --- ROW 3 ---
    {
      id: 'care-team',
      title: 'Care Team',
      desc: 'Add Doctors, Labs, Pharmacies to your network',
      icon: Users,
      onClick: () => onNavigate?.('attendance'),
    },
    {
      id: 'inventory',
      title: 'Inventory settings',
      desc: 'Add, Manage, Edit your medicines, supplies & equipments inventory',
      icon: Package,
      onClick: () => setActiveModal('inventory'),
    },
    {
      id: 'account-settings',
      title: 'Account settings',
      desc: 'Download and view your daily expenses, cash received and deposits',
      icon: Wallet,
      onClick: () => setActiveModal('account-settings'),
    },
    {
      id: 'incentives',
      title: 'Incentives',
      desc: 'Create & assign staff incentives with conversion percentages & treatment percentages',
      icon: Coins,
      onClick: () => setActiveModal('incentives'),
    },
    {
      id: 'general-settings',
      title: 'General settings',
      desc: 'List of all general clinic settings',
      icon: Settings,
      onClick: () => setActiveModal('general-settings'),
    },
    {
      id: 'change-password',
      title: 'Change password',
      desc: 'Update and secure your account access credentials',
      icon: KeyRound,
      onClick: () => setActiveModal('change-password'),
    },
  ];

  return (
    <div className="min-h-full bg-white text-slate-800 py-10 px-4 sm:px-8 lg:px-12 select-none">
      <div className="max-w-[1400px] mx-auto">
        {/* 18 Features 3x6 Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-x-6 gap-y-12">
          {tiles.map((tile) => {
            const Icon = tile.icon;
            return (
              <div
                key={tile.id}
                onClick={tile.onClick}
                className="group flex flex-col items-center text-center cursor-pointer p-3 rounded-xl transition-all duration-200 hover:-translate-y-1 hover:bg-slate-50/80"
              >
                {/* Soft Teal Circular Outline Icon */}
                <div className="w-16 h-16 rounded-full border-2 border-[#20b2aa] flex items-center justify-center text-[#20b2aa] group-hover:bg-[#20b2aa]/10 transition-colors shadow-sm">
                  <Icon className="w-8 h-8 stroke-[1.7]" />
                </div>

                {/* Title */}
                <h5 className="font-semibold text-slate-900 text-[14px] mt-3.5 leading-snug group-hover:text-[#20b2aa] transition-colors">
                  {tile.title}
                </h5>

                {/* Description */}
                <p className="text-[12px] text-slate-500 mt-1 max-w-[160px] leading-relaxed">
                  {tile.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* 1. Clinic Details Modal */}
      <Modal
        isOpen={activeModal === 'clinic-details'}
        onClose={() => setActiveModal(null)}
        title="Clinic Details"
        description="Update information about your clinic. Information will appear on all searches."
        maxWidth="md"
        footer={
          <Button
            size="sm"
            variant="primary"
            onClick={() => setActiveModal(null)}
            className="!bg-[#00c853] hover:!bg-[#00b048]"
          >
            Save Clinic Details
          </Button>
        }
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Clinic / Hospital Name</label>
            <input
              type="text"
              value={clinicName}
              onChange={(e) => setClinicName(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded focus:border-[#00c853] focus:outline-none"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Address</label>
            <textarea
              rows={2}
              value={clinicAddress}
              onChange={(e) => setClinicAddress(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded focus:border-[#00c853] focus:outline-none"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Contact Phone</label>
            <input
              type="text"
              value={clinicPhone}
              onChange={(e) => setClinicPhone(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded focus:border-[#00c853] focus:outline-none"
            />
          </div>
        </div>
      </Modal>

      {/* 2. EMR Settings Modal */}
      <Modal
        isOpen={activeModal === 'emr-settings'}
        onClose={() => setActiveModal(null)}
        title="EMR Settings"
        description="Add consultation notes and templates to be available during consultation."
        maxWidth="md"
        footer={
          <Button
            size="sm"
            variant="primary"
            onClick={() => setActiveModal(null)}
            className="!bg-[#00c853] hover:!bg-[#00b048]"
          >
            Save EMR Templates
          </Button>
        }
      >
        <div className="space-y-3 text-xs">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="font-semibold text-slate-800">General OPD SOAP Template</span>
            <p className="text-slate-500 text-[11px] mt-0.5">Subjective, Objective, Assessment, Plan structured form.</p>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="font-semibold text-slate-800">Pediatric Clinical Vitals Template</span>
            <p className="text-slate-500 text-[11px] mt-0.5">Height/weight percentiles, immunization record tracker.</p>
          </div>
        </div>
      </Modal>

      {/* 3. SMS Settings Modal */}
      <Modal
        isOpen={activeModal === 'sms-settings'}
        onClose={() => setActiveModal(null)}
        title="SMS Settings"
        description="Configure automated clinic SMS reminder templates."
        maxWidth="md"
        footer={
          <Button
            size="sm"
            variant="primary"
            onClick={() => setActiveModal(null)}
            className="!bg-[#00c853] hover:!bg-[#00b048]"
          >
            Save SMS Configuration
          </Button>
        }
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Sender ID / Prefix</label>
            <input
              type="text"
              value={smsPrefix}
              onChange={(e) => setSmsPrefix(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded focus:border-[#00c853] focus:outline-none"
            />
          </div>
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-[11px]">
            Unlimited SMS gateway connected. Templates adhere to standard TRAI healthcare DLT guidelines.
          </div>
        </div>
      </Modal>

      {/* 4. Master Templates Modal */}
      <Modal
        isOpen={activeModal === 'master-templates'}
        onClose={() => setActiveModal(null)}
        title="Master Templates"
        description="Pre-configure your prescription, notes, lab tests and treatments."
        maxWidth="md"
        footer={
          <Button
            size="sm"
            variant="primary"
            onClick={() => setActiveModal(null)}
            className="!bg-[#00c853] hover:!bg-[#00b048]"
          >
            Done
          </Button>
        }
      >
        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded border border-slate-200">
            <div>
              <div className="font-semibold text-slate-800">Hypertension Standard Protocol</div>
              <div className="text-[11px] text-slate-500">Amlodipine 5mg + Telmisartan 40mg with BP chart</div>
            </div>
            <span className="text-[11px] text-[#00c853] font-bold">Configured</span>
          </div>
          <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded border border-slate-200">
            <div>
              <div className="font-semibold text-slate-800">Upper Respiratory Infection (URI)</div>
              <div className="text-[11px] text-slate-500">Paracetamol + Antihistamine regimen</div>
            </div>
            <span className="text-[11px] text-[#00c853] font-bold">Configured</span>
          </div>
        </div>
      </Modal>

      {/* 5. Print Settings Modal */}
      <Modal
        isOpen={activeModal === 'print-settings'}
        onClose={() => setActiveModal(null)}
        title="Print Settings"
        description="Configure your summary, billing and prescription prints."
        maxWidth="md"
        footer={
          <Button
            size="sm"
            variant="primary"
            onClick={() => setActiveModal(null)}
            className="!bg-[#00c853] hover:!bg-[#00b048]"
          >
            Save Print Layout
          </Button>
        }
      >
        <div className="space-y-3 text-xs">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" defaultChecked className="text-[#00c853] rounded" />
            <span>Include Clinic Logo in prescription header</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" defaultChecked className="text-[#00c853] rounded" />
            <span>Print Patient Barcode & MRN on receipt slips</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" defaultChecked className="text-[#00c853] rounded" />
            <span>Print Doctor Registration & Signature strip</span>
          </label>
        </div>
      </Modal>

      {/* 6. Communication Modal */}
      <Modal
        isOpen={activeModal === 'communication'}
        onClose={() => setActiveModal(null)}
        title="Communication"
        description="Send bulk SMS, Emails to your patients. Create SMS & Email groups."
        maxWidth="md"
        footer={
          <Button
            size="sm"
            variant="primary"
            onClick={() => setActiveModal(null)}
            className="!bg-[#00c853] hover:!bg-[#00b048]"
          >
            Close
          </Button>
        }
      >
        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div>
              <div className="font-bold text-slate-800">All Registered Patients</div>
              <div className="text-[11px] text-slate-500">Group count: 124 Patients</div>
            </div>
            <button className="px-3 py-1 bg-[#00c853] text-white rounded font-medium flex items-center gap-1">
              <Send className="w-3 h-3" />
              <span>Broadcast</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* 7. Loyalty Modal */}
      <Modal
        isOpen={activeModal === 'loyalty'}
        onClose={() => setActiveModal(null)}
        title="Loyalty & Memberships"
        description="Configure offers & memberships to be made available to your patients."
        maxWidth="md"
        footer={
          <Button
            size="sm"
            variant="primary"
            onClick={() => setActiveModal(null)}
            className="!bg-[#00c853] hover:!bg-[#00b048]"
          >
            Done
          </Button>
        }
      >
        <div className="space-y-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className="font-semibold text-slate-800">Senior Citizen Care Plan (15% Off Consultations)</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Applied automatically for patients aged 60+</div>
          </div>
        </div>
      </Modal>

      {/* 8. Add Consultant Modal */}
      <Modal
        isOpen={activeModal === 'add-consultant'}
        onClose={() => setActiveModal(null)}
        title="Add Consultant"
        description="Create, Edit, Delete your clinic consultants. Assign temporary access to EMR settings."
        maxWidth="md"
        footer={
          <Button
            size="sm"
            variant="primary"
            onClick={() => setActiveModal(null)}
            className="!bg-[#00c853] hover:!bg-[#00b048]"
          >
            Save Consultant
          </Button>
        }
      >
        <div className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Doctor / Consultant Name</label>
            <input type="text" placeholder="Dr. Jane Doe, MD" className="w-full p-2 border border-slate-300 rounded" />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Speciality</label>
            <input type="text" placeholder="Cardiology / Pediatrics" className="w-full p-2 border border-slate-300 rounded" />
          </div>
        </div>
      </Modal>

      {/* 9. Clinic ID Generation Modal */}
      <Modal
        isOpen={activeModal === 'clinic-id'}
        onClose={() => setActiveModal(null)}
        title="Clinic ID Generation"
        description="Automatically assign Patient IDs, Invoice IDs, and Bill IDs for all your patients."
        maxWidth="md"
        footer={
          <Button
            size="sm"
            variant="primary"
            onClick={() => setActiveModal(null)}
            className="!bg-[#00c853] hover:!bg-[#00b048]"
          >
            Update Sequencing
          </Button>
        }
      >
        <div className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Patient ID Prefix</label>
            <input type="text" defaultValue="PAT-" className="w-full p-2 border border-slate-300 rounded" />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Invoice Number Prefix</label>
            <input type="text" defaultValue="INV-2026-" className="w-full p-2 border border-slate-300 rounded" />
          </div>
        </div>
      </Modal>

      {/* 10. Inventory Modal */}
      <Modal
        isOpen={activeModal === 'inventory'}
        onClose={() => setActiveModal(null)}
        title="Inventory Settings"
        description="Add, Manage, and Edit your medicines, supplies & equipment inventory."
        maxWidth="md"
        footer={
          <Button
            size="sm"
            variant="primary"
            onClick={() => setActiveModal(null)}
            className="!bg-[#00c853] hover:!bg-[#00b048]"
          >
            Done
          </Button>
        }
      >
        <div className="space-y-2 text-xs">
          <p className="text-slate-600">
            Formulary stock levels are synchronized with consultation desk e-Prescriptions automatically.
          </p>
        </div>
      </Modal>

      {/* 11. Account Settings Modal */}
      <Modal
        isOpen={activeModal === 'account-settings'}
        onClose={() => setActiveModal(null)}
        title="Account Settings"
        description="Download and view your daily expenses, cash received and deposits."
        maxWidth="md"
        footer={
          <Button
            size="sm"
            variant="primary"
            onClick={() => setActiveModal(null)}
            className="!bg-[#00c853] hover:!bg-[#00b048]"
          >
            Done
          </Button>
        }
      >
        <div className="space-y-2 text-xs">
          <p className="text-slate-600">Daily reconciliation records are logged in Billing & Reports.</p>
        </div>
      </Modal>

      {/* 12. Incentives Modal */}
      <Modal
        isOpen={activeModal === 'incentives'}
        onClose={() => setActiveModal(null)}
        title="Staff Incentives"
        description="Create & assign staff incentives with conversion percentages & treatment percentages."
        maxWidth="md"
        footer={
          <Button
            size="sm"
            variant="primary"
            onClick={() => setActiveModal(null)}
            className="!bg-[#00c853] hover:!bg-[#00b048]"
          >
            Save Incentives
          </Button>
        }
      >
        <div className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Consultation Referral Incentive (%)</label>
            <input type="number" defaultValue="10" className="w-full p-2 border border-slate-300 rounded" />
          </div>
        </div>
      </Modal>

      {/* 13. General Settings Modal */}
      <Modal
        isOpen={activeModal === 'general-settings'}
        onClose={() => setActiveModal(null)}
        title="General Settings"
        description="List of all general clinic settings and operating hours."
        maxWidth="md"
        footer={
          <Button
            size="sm"
            variant="primary"
            onClick={() => setActiveModal(null)}
            className="!bg-[#00c853] hover:!bg-[#00b048]"
          >
            Save Settings
          </Button>
        }
      >
        <div className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Operating Hours</label>
            <input type="text" defaultValue="09:00 AM - 08:00 PM" className="w-full p-2 border border-slate-300 rounded" />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Timezone</label>
            <input type="text" defaultValue="Asia/Kolkata (IST)" disabled className="w-full p-2 bg-slate-100 border border-slate-300 rounded text-slate-500" />
          </div>
        </div>
      </Modal>

      {/* 14. Change Password Modal */}
      <Modal
        isOpen={activeModal === 'change-password'}
        onClose={() => setActiveModal(null)}
        title="Change Password"
        description="Update your account login password."
        maxWidth="sm"
      >
        <form onSubmit={handlePasswordChange} className="space-y-3 text-xs">
          {passwordSuccess ? (
            <div className="p-4 bg-emerald-50 text-emerald-800 rounded-lg text-center flex flex-col items-center gap-1.5">
              <CheckCircle2 className="w-6 h-6 text-[#00c853]" />
              <span className="font-semibold text-sm">Password Updated Successfully!</span>
            </div>
          ) : (
            <>
              {passwordError && (
                <div className="p-2 bg-rose-50 text-rose-700 rounded border border-rose-200 text-xs">
                  {passwordError}
                </div>
              )}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Current Password</label>
                <input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full p-2 border border-slate-300 rounded focus:border-[#00c853] focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full p-2 border border-slate-300 rounded focus:border-[#00c853] focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full p-2 border border-slate-300 rounded focus:border-[#00c853] focus:outline-none"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" size="sm" variant="outline" onClick={() => setActiveModal(null)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" variant="primary" className="!bg-[#00c853] hover:!bg-[#00b048]">
                  Update Password
                </Button>
              </div>
            </>
          )}
        </form>
      </Modal>
    </div>
  );
};

