import React, { useState, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { SignUpView } from './SignUpView';
import { resetDemoData } from '@/data/storage';
import { AuthAudience } from '@/services/authService';
import {
  User as UserIcon,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
} from 'lucide-react';

function getLastUsedAudience(): AuthAudience | null {
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem('cms_auth_audience');
    if (saved === 'patient' || saved === 'staff' || saved === 'admin') {
      return saved as AuthAudience;
    }
  } catch {
    // fallback
  }
  return null;
}

function parseInitialRoute(): {
  audience: AuthAudience | null;
  viewMode: 'login' | 'signup';
} {
  if (typeof window === 'undefined') {
    return { audience: null, viewMode: 'login' };
  }
  try {
    const params = new URLSearchParams(window.location.search);
    const asParam = params.get('as');
    const roleParam = params.get('role');
    const viewParam = params.get('view');
    const pathname = window.location.pathname.toLowerCase();

    let audience: AuthAudience | null = null;
    if (asParam === 'patient' || pathname.includes('/patient')) {
      audience = 'patient';
    } else if (asParam === 'admin' || roleParam === 'admin' || roleParam === 'md' || pathname.includes('/admin')) {
      audience = 'admin';
    } else if (asParam === 'staff' || pathname.includes('/staff')) {
      audience = 'staff';
    }

    let viewMode: 'login' | 'signup' = 'login';
    if (viewParam === 'signup' || pathname.includes('/signup')) {
      viewMode = 'signup';
    }

    return { audience, viewMode };
  } catch {
    return { audience: null, viewMode: 'login' };
  }
}

export const LoginView: React.FC = () => {
  const { login } = useAuth();
  const initialRoute = parseInitialRoute();
  const lastUsedAudience = getLastUsedAudience();

  const [audience, setAudience] = useState<AuthAudience>(() =>
    initialRoute.audience !== null ? initialRoute.audience : lastUsedAudience || 'staff'
  );
  const [viewMode, setViewMode] = useState<'login' | 'signup'>(() => initialRoute.viewMode);

  // Form inputs defaults based on audience
  const [identifier, setIdentifier] = useState(() => {
    if (initialRoute.audience === 'admin') return 'admin';
    if (initialRoute.audience === 'patient') return 'patient';
    return 'doctor';
  });
  const [password, setPassword] = useState(() => {
    if (initialRoute.audience === 'admin') return 'Admin@12345';
    if (initialRoute.audience === 'patient') return 'Patient@123';
    return 'Doctor@123';
  });
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Preserve typed sign-up fields
  const [sharedFullName, setSharedFullName] = useState('');
  const [sharedEmail, setSharedEmail] = useState('');
  const [sharedPhone, setSharedPhone] = useState('');

  // Status and error handling
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [identifierError, setIdentifierError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isForgotPasswordModalOpen, setIsForgotPasswordModalOpen] = useState(false);

  // Reset demo modal
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const identifierInputRef = useRef<HTMLInputElement>(null);

  const handleSelectAudience = (newAudience: AuthAudience) => {
    setAudience(newAudience);
    setErrorMessage(null);
    setIdentifierError(null);
    setPasswordError(null);
    try {
      localStorage.setItem('cms_auth_audience', newAudience);
    } catch {}
    if (newAudience === 'admin') {
      setIdentifier('admin');
      setPassword('Admin@12345');
    } else if (newAudience === 'patient') {
      setIdentifier('patient');
      setPassword('Patient@123');
    } else {
      setIdentifier('doctor');
      setPassword('Doctor@123');
    }
  };

  const handleFillDemoRole = (roleKey: string, rolePass: string, roleAudience: AuthAudience) => {
    setIdentifier(roleKey);
    setPassword(rolePass);
    setAudience(roleAudience);
    setErrorMessage(null);
    setIdentifierError(null);
    setPasswordError(null);
    try {
      localStorage.setItem('cms_auth_audience', roleAudience);
    } catch {}
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIdentifierError(null);
    setPasswordError(null);

    let hasError = false;
    if (!identifier.trim()) {
      setIdentifierError('Please enter your email or username.');
      hasError = true;
    }
    if (!password.trim()) {
      setPasswordError('Please enter your password.');
      hasError = true;
    }
    if (hasError) return;

    setIsSubmitting(true);

    let result = await login(identifier.trim(), password, audience, rememberMe, {
      deferAuth: true,
    });

    // If account exists in another portal, give helpful navigation
    if (result.code === 'wrongPortal' && result.expectedAudience) {
      // If user typed valid credentials for a different portal, automatically adapt audience
      const target = result.expectedAudience;
      setAudience(target);
      result = await login(identifier.trim(), password, target, rememberMe, {
        deferAuth: true,
      });
    }

    setIsSubmitting(false);

    if (!result.success) {
      setErrorMessage(result.error || 'Incorrect Email ID or Password. Please check credentials.');
      return;
    }

    result.completeNavigation?.();
  };

  const handleConfirmResetDemo = async () => {
    setIsResetting(true);
    await resetDemoData('SOEZY Login');
    setIsResetting(false);
    setIsResetModalOpen(false);
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-700 flex flex-col justify-between font-sans select-none relative overflow-hidden">
      {/* 1. TOP HEADER LIKE PREVIOUS PART */}
      <header className="bg-[#28465a] h-14 flex items-center justify-between px-4 sm:px-12 lg:px-24 relative shadow-sm shrink-0 w-full z-10">
        {/* SOEZY Logo on top bar background */}
        <div className="flex items-center">
          <img
            src="/soezy-logo.png"
            alt="SOEZY - It's All Easy"
            className="h-9 sm:h-10 w-auto object-contain select-none"
          />
        </div>

        {/* Support Phone on Right */}
        <div className="flex flex-col items-end text-white">
          <span className="text-[10px] text-slate-300 leading-tight">For Support</span>
          <a
            href="tel:+919543279999"
            className="text-xs sm:text-sm font-bold tracking-wide flex items-center gap-1.5 text-white hover:text-slate-200 transition-colors"
          >
            <span>+ 91 9543279999</span>
          </a>
        </div>
      </header>

      {/* Main Centered Card Container */}
      <main className="flex-1 flex items-center justify-center py-8 px-4 w-full relative z-10">
        {/* Minimal Auth Card */}
        <div className="w-full max-w-[400px] bg-white/95 backdrop-blur-sm border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.05)]">
          {/* Portal Switcher Tabs */}
          <div className="flex items-center justify-center p-1 bg-slate-100 rounded-xl mb-6">
            <button
              type="button"
              onClick={() => handleSelectAudience('staff')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                audience === 'staff'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Staff
            </button>
            <button
              type="button"
              onClick={() => handleSelectAudience('admin')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                audience === 'admin'
                  ? 'bg-[#28465a] text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Admin
            </button>
            <button
              type="button"
              onClick={() => handleSelectAudience('patient')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                audience === 'patient'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Patient
            </button>
          </div>

          {/* Heading */}
          <div className="text-center mb-5">
            {audience === 'admin' ? (
              <>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#28465a]/10 text-[#28465a] text-[11px] font-semibold mb-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#28465a]" />
                  <span>Clinic Administrator</span>
                </div>
                <h1 className="text-xl font-bold text-slate-800 tracking-tight">
                  Admin Sign In
                </h1>
              </>
            ) : audience === 'patient' ? (
              <h1 className="text-xl font-bold text-slate-800 tracking-tight">
                Patient Sign In
              </h1>
            ) : (
              <h1 className="text-xl font-bold text-slate-800 tracking-tight">
                Staff Sign In
              </h1>
            )}
          </div>

          {viewMode === 'signup' ? (
            <SignUpView
              contentOnly
              audience={audience}
              fullName={sharedFullName}
              onFullNameChange={setSharedFullName}
              email={sharedEmail}
              onEmailChange={setSharedEmail}
              phone={sharedPhone}
              onPhoneChange={setSharedPhone}
              onChangeAudience={() => handleSelectAudience(audience === 'patient' ? 'staff' : 'patient')}
              onBackToLogin={() => setViewMode('login')}
            />
          ) : (
            <form onSubmit={handleLoginSubmit} noValidate className="space-y-4">
              {/* Error Banner */}
              {errorMessage && (
                <div
                  role="alert"
                  className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg"
                >
                  {errorMessage}
                </div>
              )}

              {/* Email / Username input */}
              <div>
                <div className="relative flex items-center">
                  <input
                    ref={identifierInputRef}
                    type="text"
                    value={identifier}
                    onChange={(e) => {
                      setIdentifier(e.target.value);
                      if (identifierError) setIdentifierError(null);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder={
                      audience === 'admin'
                        ? 'Admin ID or Email'
                        : audience === 'patient'
                        ? 'Patient ID or Phone'
                        : 'Staff ID or Email'
                    }
                    className={`w-full h-11 px-3.5 pr-10 border rounded-xl text-sm text-slate-800 placeholder-slate-400 outline-none transition-all ${
                      identifierError
                        ? 'border-rose-400'
                        : 'border-slate-300 focus:border-slate-400'
                    }`}
                  />
                  <UserIcon className="w-4 h-4 text-slate-400 absolute right-3 pointer-events-none" />
                </div>
                {identifierError && (
                  <p className="mt-1 text-xs text-rose-600">{identifierError}</p>
                )}
              </div>

              {/* Password input */}
              <div>
                <div className="relative flex items-center">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (passwordError) setPasswordError(null);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder="Password"
                    className={`w-full h-11 px-3.5 pr-16 border rounded-xl text-sm text-slate-800 placeholder-slate-400 outline-none transition-all ${
                      passwordError
                        ? 'border-rose-400'
                        : 'border-slate-300 focus:border-slate-400'
                    }`}
                  />
                  <div className="absolute right-3 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <Lock className="w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                {passwordError && (
                  <p className="mt-1 text-xs text-rose-600">{passwordError}</p>
                )}
              </div>

              {/* Sign In Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-11 bg-[#00c060] hover:bg-[#00ab55] active:bg-[#00964b] text-white text-sm font-semibold tracking-wide rounded-xl transition-colors shadow-sm disabled:opacity-60 cursor-pointer"
              >
                {isSubmitting
                  ? 'Signing in...'
                  : audience === 'admin'
                  ? 'Sign In as Administrator'
                  : 'Sign In'}
              </button>

              {/* Remember Me and Forgot Password */}
              <div className="flex items-center justify-between text-xs pt-0.5">
                <label className="flex items-center gap-2 text-slate-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-[#00c060] focus:ring-0 cursor-pointer"
                  />
                  <span>Remember me</span>
                </label>

                <button
                  type="button"
                  onClick={() => setIsForgotPasswordModalOpen(true)}
                  className="text-[#00c060] hover:text-[#00ab55] hover:underline cursor-pointer font-medium"
                >
                  Forgot password?
                </button>
              </div>

              {/* Minimal Demo Access Switcher */}
              <div className="mt-6 pt-5 border-t border-slate-100 text-center">
                <div className="flex items-center justify-center gap-1.5 flex-wrap">
                  <span className="text-[11px] text-slate-400 mr-1">Demo:</span>
                  {audience === 'admin' ? (
                    <div className="flex flex-col gap-2 w-full text-left">
                      <button
                        type="button"
                        onClick={() => handleFillDemoRole('superadmin', 'SuperAdmin@12345', 'admin')}
                        className="px-3 py-1.5 text-xs rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 font-semibold transition-colors cursor-pointer flex items-center justify-between"
                      >
                        <span className="font-bold">Platform Super Admin (superadmin)</span>
                        <span className="text-[11px] text-purple-700 font-normal">multi-clinic switcher, global network provisioning</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleFillDemoRole('admin', 'Admin@12345', 'admin')}
                        className="px-3 py-1.5 text-xs rounded-lg bg-[#00c060]/10 hover:bg-[#00c060]/20 text-[#28465a] font-semibold transition-colors cursor-pointer flex items-center justify-between"
                      >
                        <span className="font-bold">Clinic Administrator (Meera Krishnan)</span>
                        <span className="text-[11px] text-slate-500 font-normal">approve staff, manage roles, billing corrections, ledger</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleFillDemoRole('md', 'Doctor@123', 'admin')}
                        className="px-3 py-1.5 text-xs rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors cursor-pointer flex items-center justify-between"
                      >
                        <span className="font-semibold">Lead physician (Dr. Marcus Vance)</span>
                        <span className="text-[11px] text-slate-500 font-normal">clinical supervision, worklist, care transfers</span>
                      </button>
                    </div>
                  ) : audience === 'patient' ? (
                    <button
                      type="button"
                      onClick={() => handleFillDemoRole('patient', 'Patient@123', 'patient')}
                      className="px-2.5 py-1 text-xs rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors cursor-pointer"
                    >
                      Patient (Eleanor Vance)
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => handleFillDemoRole('admin', 'Admin@12345', 'staff')}
                        className="px-2.5 py-1 text-xs rounded-lg bg-[#00c060]/10 hover:bg-[#00c060]/20 text-[#28465a] font-semibold transition-colors cursor-pointer"
                        title="approve staff, manage roles, billing corrections, ledger"
                      >
                        Administrator
                      </button>
                      <button
                        type="button"
                        onClick={() => handleFillDemoRole('md', 'Doctor@123', 'staff')}
                        className="px-2.5 py-1 text-xs rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors cursor-pointer"
                      >
                        Lead physician
                      </button>
                      <button
                        type="button"
                        onClick={() => handleFillDemoRole('doctor', 'Doctor@123', 'staff')}
                        className="px-2.5 py-1 text-xs rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors cursor-pointer"
                      >
                        Doctor
                      </button>
                      <button
                        type="button"
                        onClick={() => handleFillDemoRole('receptionist', 'Doctor@123', 'staff')}
                        className="px-2.5 py-1 text-xs rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors cursor-pointer"
                      >
                        Reception
                      </button>
                    </>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-center gap-3 text-xs text-slate-400">
                  <button
                    type="button"
                    onClick={() => setViewMode('signup')}
                    className="text-[#00c060] hover:underline cursor-pointer font-medium"
                  >
                    Create account
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() => setIsResetModalOpen(true)}
                    className="hover:text-slate-600 cursor-pointer"
                  >
                    Reset demo data
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </main>

      {/* Minimal Footer */}
      <footer className="py-4 text-center text-xs text-slate-400 select-none relative z-10">
        © SOEZY
      </footer>

      {/* Forgot Password Modal */}
      <Modal
        isOpen={isForgotPasswordModalOpen}
        onClose={() => setIsForgotPasswordModalOpen(false)}
        title="Password Assistance"
        maxWidth="sm"
        footer={
          <div className="flex justify-end">
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsForgotPasswordModalOpen(false)}
            >
              Close
            </Button>
          </div>
        }
      >
        <div className="space-y-3 text-xs text-slate-600">
          <p>
            To reset your password, please contact your clinic administrator or support:
          </p>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-800">
            Helpline: +91 9543279999
          </div>
        </div>
      </Modal>

      {/* Reset Demo Data Modal */}
      <Modal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        title="Reset Demo Data"
        maxWidth="sm"
        footer={
          <div className="flex justify-end gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsResetModalOpen(false)}
              disabled={isResetting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleConfirmResetDemo}
              isLoading={isResetting}
            >
              Restore Demo Data
            </Button>
          </div>
        }
      >
        <p className="text-xs text-slate-700 leading-relaxed">
          Restore the demo data? All modifications made in this browser will be reset to default.
        </p>
      </Modal>
    </div>
  );
};

export default LoginView;
