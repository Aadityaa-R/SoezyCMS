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
    <div className="min-h-screen bg-slate-50 text-slate-700 flex flex-col justify-between font-sans select-none relative overflow-hidden">
      {/* 1. TOP HEADER LIKE PREVIOUS PART */}
      <header className="bg-[#1e3a5f] h-14 flex items-center justify-between px-4 sm:px-12 lg:px-24 relative shadow-sm shrink-0 w-full z-10">
        {/* Slanted White SOEZY Logo Tab */}
        <div className="bg-white h-14 px-7 sm:px-10 flex items-center justify-center -skew-x-[26deg] shadow-md ml-0 sm:ml-4">
          <div className="skew-x-[26deg] flex items-center justify-center py-1">
            <img
              src="/soezy-logo.png"
              alt="SOEZY - It's All Easy"
              className="h-9 sm:h-10 w-auto object-contain select-none"
            />
          </div>
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

      {/* Translucent SOEZY Watermark Design in Background */}
      <div
        aria-hidden="true"
        className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0 overflow-hidden"
      >
        <img
          src="/soezy-logo.png"
          alt=""
          className="w-[1150px] max-w-[95vw] opacity-[0.11] select-none transform scale-110"
        />
      </div>

      {/* Main Centered Card Container */}
      <main className="flex-1 flex items-center justify-center py-10 px-4 w-full relative z-10">
        {/* Minimal Auth Card */}
        <div className="w-full max-w-[390px] bg-white/95 backdrop-blur-sm border border-slate-200/90 rounded-2xl p-7 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.05)]">
          <h1 className="text-xl font-bold text-slate-800 text-center tracking-tight mb-6">
            Sign In
          </h1>

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

                {/* Sign In Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-11 bg-[#00c060] hover:bg-[#00ab55] active:bg-[#00964b] text-white text-sm font-semibold tracking-wide rounded-xl transition-colors shadow-sm disabled:opacity-60 cursor-pointer"
                >
                  {isSubmitting ? 'Signing in...' : 'Sign In'}
                </button>

                {/* Remember Me and Forgot Password */}
                <div className="flex items-center justify-between text-xs pt-0.5">
                  <label className="flex items-center gap-2 text-slate-600 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-[#00c060] focus:ring-[#00c060] cursor-pointer"
                    />
                    <span>Remember me</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => setIsForgotPasswordModalOpen(true)}
                    className="text-teal-600 hover:text-teal-700 hover:underline cursor-pointer font-medium"
                  >
                    Forgot password?
                  </button>
                </div>

                {/* Minimal Demo Access Switcher */}
                <div className="mt-6 pt-5 border-t border-slate-100 text-center">
                  <div className="flex items-center justify-center gap-1.5 flex-wrap">
                    <span className="text-[11px] text-slate-400 mr-1">Demo:</span>
                    <button
                      type="button"
                      onClick={() => handleFillDemoRole('doctor', 'Doctor@123', 'staff')}
                      className="px-2.5 py-1 text-xs rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors cursor-pointer"
                    >
                      Doctor
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFillDemoRole('md', 'Doctor@123', 'staff')}
                      className="px-2.5 py-1 text-xs rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors cursor-pointer"
                    >
                      Admin
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFillDemoRole('receptionist', 'Doctor@123', 'staff')}
                      className="px-2.5 py-1 text-xs rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors cursor-pointer"
                    >
                      Reception
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFillDemoRole('patient', 'Patient@123', 'patient')}
                      className="px-2.5 py-1 text-xs rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors cursor-pointer"
                    >
                      Patient
                    </button>
                  </div>

                  <div className="mt-4 flex items-center justify-center gap-3 text-xs text-slate-400">
                    <button
                      type="button"
                      onClick={() => setViewMode('signup')}
                      className="text-teal-600 hover:underline cursor-pointer font-medium"
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
