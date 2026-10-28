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
  Users,
  Smartphone,
  Building2,
} from 'lucide-react';

function getLastUsedAudience(): AuthAudience | null {
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem('cms_auth_audience');
    if (saved === 'patient' || saved === 'staff') {
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
    const viewParam = params.get('view');
    const pathname = window.location.pathname.toLowerCase();

    let audience: AuthAudience | null = null;
    if (asParam === 'patient' || pathname.includes('/patient')) {
      audience = 'patient';
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

  // Form inputs
  const [identifier, setIdentifier] = useState('doctor');
  const [password, setPassword] = useState('Doctor@123');
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

  const handleFillDemoRole = (roleKey: string, rolePass: string, roleAudience: AuthAudience) => {
    setIdentifier(roleKey);
    setPassword(rolePass);
    setAudience(roleAudience);
    setErrorMessage(null);
    setIdentifierError(null);
    setPasswordError(null);
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

    // Determine target audience; auto-detect patient keywords or default to current audience
    const cleanId = identifier.trim().toLowerCase();
    const effectiveAudience: AuthAudience =
      cleanId.includes('patient') || cleanId === 'eleanor' ? 'patient' : audience;

    let result = await login(identifier.trim(), password, effectiveAudience, rememberMe, {
      deferAuth: true,
    });

    // If account exists in the other portal, seamlessly authenticate into the expected portal
    if (result.code === 'wrongPortal' && result.expectedAudience) {
      setAudience(result.expectedAudience);
      result = await login(identifier.trim(), password, result.expectedAudience, rememberMe, {
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
    <div className="min-h-screen bg-white text-slate-700 flex flex-col justify-between overflow-x-hidden font-sans">
      {/* 1. TOP HEADER */}
      <header className="bg-[#1e3a5f] h-14 flex items-center justify-between px-4 sm:px-12 lg:px-24 relative shadow-sm shrink-0">
        {/* Slanted White SOEZY Logo Tab */}
        <div className="bg-white h-14 px-7 sm:px-10 flex items-center justify-center -skew-x-[26deg] shadow-md ml-0 sm:ml-4">
          <div className="skew-x-[26deg] flex items-center justify-center">
            {/* Exact SVG recreation of SOEZY Logo with stylized red S, oEzy and tagline */}
            <svg
              width="130"
              height="40"
              viewBox="0 0 160 50"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="select-none"
              aria-label="SOEZY - It's All Easy"
            >
              <path d="M12 40 L34 16 L145 16 L140 23 L42 23 L24 40 Z" fill="#cc0000" />
              <path d="M22 40 L38 21 L142 21 L145 16 L34 16 L12 40 Z" fill="#e60000" />
              <path d="M18 40 L32 25 L65 25 L56 33 L32 33 L26 40 Z" fill="#990000" />
              <text
                x="56"
                y="40"
                fontFamily="'Arial Black', Impact, sans-serif"
                fontWeight="900"
                fontStyle="italic"
                fontSize="27"
                fill="#475569"
                letterSpacing="-1"
              >
                oEzy
              </text>
              <text
                x="68"
                y="48"
                fontFamily="'Segoe UI', Arial, sans-serif"
                fontWeight="600"
                fontSize="7.5"
                fill="#64748b"
                letterSpacing="0.4"
              >
                It's All Easy
              </text>
            </svg>
          </div>
        </div>

        {/* Support Phone on Right */}
        <div className="flex flex-col items-end text-white">
          <span className="text-[11px] text-slate-300 leading-tight">For Support</span>
          <a
            href="tel:+919543279999"
            className="text-sm sm:text-base font-bold tracking-wide flex items-center gap-1.5 text-white hover:text-slate-200 transition-colors"
          >
            <Smartphone className="w-4 h-4 text-white" />
            <span>+ 91 9543279999</span>
          </a>
        </div>
      </header>

      {/* 2. MAIN CONTENT AREA */}
      <main className="flex-1 flex items-center justify-center py-10 px-4 sm:px-12 lg:px-24 max-w-[1320px] mx-auto w-full gap-10 lg:gap-20 flex-col lg:flex-row">
        {/* Left Column: Platform Title & 3 Feature Highlights */}
        <section className="flex-1 flex flex-col gap-8 w-full max-w-xl">
          <h1 className="text-teal-600 dark:text-teal-500 text-2xl sm:text-[27px] font-semibold tracking-tight">
            India's 1st Integrated Digital Healthcare Platform
          </h1>

          <div className="flex flex-col gap-7">
            {/* Feature 1: Easy Access */}
            <div className="flex items-start gap-5">
              <div className="w-11 h-11 shrink-0 text-orange-500 flex items-center justify-center">
                <Users className="w-10 h-10 stroke-[1.8]" />
              </div>
              <div className="flex flex-col gap-0.5">
                <h2 className="text-base sm:text-lg font-semibold text-slate-800">
                  Easy Access
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                  Access your Patient's record anywhere and anytime.
                </p>
              </div>
            </div>

            {/* Feature 2: Digitized communication */}
            <div className="flex items-start gap-5">
              <div className="w-11 h-11 shrink-0 text-orange-500 flex items-center justify-center">
                <svg
                  width="40"
                  height="40"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
                  <path d="M12 18h.01" />
                  <path d="M19 7l-7 5-7-5" />
                  <rect width="14" height="10" x="5" y="7" rx="1" />
                </svg>
              </div>
              <div className="flex flex-col gap-0.5">
                <h2 className="text-base sm:text-lg font-semibold text-slate-800">
                  Digitized communication
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                  Unlimited SMS, Emails and Reminders.
                </p>
              </div>
            </div>

            {/* Feature 3: Grow together */}
            <div className="flex items-start gap-5">
              <div className="w-11 h-11 shrink-0 text-orange-500 flex items-center justify-center">
                <Building2 className="w-10 h-10 stroke-[1.8]" />
              </div>
              <div className="flex flex-col gap-0.5">
                <h2 className="text-base sm:text-lg font-semibold text-slate-800">
                  Grow together
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                  Connect with your preferred Labs, Hospitals and Pharmacies.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Right Column: Sign in to continue Card */}
        <section className="w-full max-w-[420px]">
          <div className="bg-white border border-slate-200 rounded shadow-[0_4px_20px_-2px_rgba(0,0,0,0.06)] p-7 sm:p-9">
            <h2 className="text-teal-600 dark:text-teal-500 text-lg sm:text-xl font-medium text-center mb-6">
              Sign in to continue
            </h2>

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
                onChangeAudience={() => setAudience(audience === 'patient' ? 'staff' : 'patient')}
                onBackToLogin={() => setViewMode('login')}
              />
            ) : (
              <form onSubmit={handleLoginSubmit} noValidate className="space-y-4">
                {/* Error Banner */}
                {errorMessage && (
                  <div
                    role="alert"
                    className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded"
                  >
                    {errorMessage}
                  </div>
                )}

                {/* Email ID input */}
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
                      placeholder="Email ID"
                      className={`w-full h-11 px-3.5 pr-10 border rounded text-sm text-slate-800 placeholder-slate-400 outline-none transition-all ${
                        identifierError
                          ? 'border-rose-400 focus:ring-1 focus:ring-rose-400'
                          : 'border-slate-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500'
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
                      className={`w-full h-11 px-3.5 pr-16 border rounded text-sm text-slate-800 placeholder-slate-400 outline-none transition-all ${
                        passwordError
                          ? 'border-rose-400 focus:ring-1 focus:ring-rose-400'
                          : 'border-slate-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500'
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

                {/* Green LOGIN Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-11 bg-[#00c060] hover:bg-[#00ab55] active:bg-[#00964b] text-white text-sm font-bold tracking-wider rounded uppercase transition-colors shadow-sm disabled:opacity-60 cursor-pointer"
                >
                  {isSubmitting ? 'LOGGING IN...' : 'LOGIN'}
                </button>

                {/* Remember Me and Forgot Password */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <label className="flex items-center gap-2 text-slate-600 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                    />
                    <span>Remember Me</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => setIsForgotPasswordModalOpen(true)}
                    className="text-teal-600 hover:underline cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>

                {/* Quick Demo Access Pills */}
                <div className="mt-5 pt-4 border-t border-dashed border-slate-200 text-center">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-2">
                    Quick Demo Access
                  </span>
                  <div className="flex flex-wrap items-center justify-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleFillDemoRole('doctor', 'Doctor@123', 'staff')}
                      className="px-2.5 py-1 text-[11px] rounded-full bg-slate-100 hover:bg-[#00c060] hover:text-white text-slate-600 font-medium transition-colors cursor-pointer border border-slate-200"
                    >
                      Doctor
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFillDemoRole('md', 'Doctor@123', 'staff')}
                      className="px-2.5 py-1 text-[11px] rounded-full bg-slate-100 hover:bg-[#00c060] hover:text-white text-slate-600 font-medium transition-colors cursor-pointer border border-slate-200"
                    >
                      MD / Admin
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFillDemoRole('receptionist', 'Doctor@123', 'staff')}
                      className="px-2.5 py-1 text-[11px] rounded-full bg-slate-100 hover:bg-[#00c060] hover:text-white text-slate-600 font-medium transition-colors cursor-pointer border border-slate-200"
                    >
                      Reception
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFillDemoRole('patient', 'Patient@123', 'patient')}
                      className="px-2.5 py-1 text-[11px] rounded-full bg-slate-100 hover:bg-[#00c060] hover:text-white text-slate-600 font-medium transition-colors cursor-pointer border border-slate-200"
                    >
                      Patient
                    </button>
                  </div>

                  <div className="mt-3 flex items-center justify-center gap-3 text-[11px] text-slate-400">
                    <button
                      type="button"
                      onClick={() => setViewMode('signup')}
                      className="text-teal-600 hover:underline cursor-pointer"
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
        </section>
      </main>

      {/* 3. BOTTOM FOOTER */}
      <footer className="h-12 border-t border-slate-100 flex items-center justify-between px-4 sm:px-12 lg:px-24 text-[11px] text-slate-400 bg-white shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <span>(c) ALL RIGHTS RESERVED SOEZY.IN</span>
          <span className="text-slate-300">|</span>
          <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-slate-600">
            PRIVACY
          </a>
          <span className="text-slate-300">|</span>
          <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-slate-600">
            TERMS AND CONDITIONS
          </a>
        </div>

        <div className="flex items-center gap-1.5">
          <a
            href="https://facebook.com"
            target="_blank"
            rel="noreferrer"
            className="w-5 h-5 rounded bg-slate-300 hover:bg-teal-600 text-white flex items-center justify-center text-[11px] font-bold transition-colors"
            title="Facebook"
          >
            f
          </a>
          <a
            href="https://linkedin.com"
            target="_blank"
            rel="noreferrer"
            className="w-5 h-5 rounded bg-slate-300 hover:bg-teal-600 text-white flex items-center justify-center text-[10px] font-bold transition-colors"
            title="LinkedIn"
          >
            in
          </a>
        </div>
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
            To reset your password, please contact SOEZY clinic support or your system administrator:
          </p>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded font-medium text-slate-800 flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-teal-600" />
            <span>Support Helpline: +91 9543279999</span>
          </div>
          <p className="text-[11px] text-slate-400">
            You may also use the Quick Demo Access pills on the login card to sign in with demo credentials.
          </p>
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
