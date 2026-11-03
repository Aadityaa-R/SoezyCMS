-- ==============================================================================
-- SoezyCMS — Production Relational Database Schema for Supabase
-- Fully normalized tables with traditional columns, relational foreign keys,
-- proper SQL data types, multi-tenant clinic scoping, and indices.
--
-- How to apply:
-- 1. Open Supabase Dashboard -> SQL Editor
-- 2. Click "New query"
-- 3. Paste this entire file and click "Run"
-- ==============================================================================

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. CLINICS (Tenant Table)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clinics (
    id TEXT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    sub_title VARCHAR(255) DEFAULT 'SOEZY Clinic Operations',
    phone VARCHAR(30),
    email VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'India',
    logo_url TEXT DEFAULT '/soezy-logo.png',
    accent_color VARCHAR(20) DEFAULT '#00c060',
    top_bar_bg VARCHAR(20) DEFAULT '#28465a',
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'trial', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 2. ACCOUNTS (Authentication & Platform Users)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.accounts (
    id TEXT PRIMARY KEY,
    clinic_id TEXT REFERENCES public.clinics(id) ON DELETE SET NULL,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(30),
    role VARCHAR(50) NOT NULL CHECK (role IN ('platform_super_admin', 'clinic_super_admin', 'admin', 'md', 'doctor', 'receptionist', 'patient')),
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    password_iterations INTEGER DEFAULT 100000,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'pending', 'rejected')),
    rejection_reason TEXT,
    claim_pending BOOLEAN DEFAULT FALSE,
    linked_patient_id TEXT,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_accounts_username ON public.accounts(username);
CREATE INDEX IF NOT EXISTS idx_accounts_email ON public.accounts(email);
CREATE INDEX IF NOT EXISTS idx_accounts_clinic_id ON public.accounts(clinic_id);
CREATE INDEX IF NOT EXISTS idx_accounts_role ON public.accounts(role);

-- ------------------------------------------------------------------------------
-- 3. STAFF (Clinical & Administrative Personnel)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.staff (
    id TEXT PRIMARY KEY,
    clinic_id TEXT NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    account_id TEXT REFERENCES public.accounts(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    title VARCHAR(150),
    department VARCHAR(100),
    specialization VARCHAR(150),
    phone VARCHAR(30),
    email VARCHAR(255),
    role VARCHAR(50) NOT NULL,
    qualification VARCHAR(255),
    consultation_fee NUMERIC(10, 2) DEFAULT 0.00,
    room_number VARCHAR(50),
    is_on_duty BOOLEAN DEFAULT FALSE,
    is_original_admin BOOLEAN DEFAULT FALSE,
    shift_id TEXT,
    capabilities TEXT[] DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'on_leave', 'inactive', 'suspended')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_clinic_id ON public.staff(clinic_id);
CREATE INDEX IF NOT EXISTS idx_staff_department ON public.staff(department);
CREATE INDEX IF NOT EXISTS idx_staff_status ON public.staff(status);

-- ------------------------------------------------------------------------------
-- 4. PATIENTS (Demographics & Medical Record)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.patients (
    id TEXT PRIMARY KEY,
    clinic_id TEXT NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    mrn VARCHAR(50) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    gender VARCHAR(20) CHECK (gender IN ('male', 'female', 'other')),
    dob DATE NOT NULL,
    age INTEGER,
    phone VARCHAR(30) NOT NULL,
    email VARCHAR(255),
    address TEXT,
    blood_group VARCHAR(10) CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
    allergies TEXT[] DEFAULT '{}',
    chronic_conditions TEXT[] DEFAULT '{}',
    emergency_contact_name VARCHAR(150),
    emergency_contact_relationship VARCHAR(50),
    emergency_contact_phone VARCHAR(30),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    registered_date DATE DEFAULT CURRENT_DATE,
    registered_by_id TEXT,
    registered_by_name VARCHAR(255),
    source VARCHAR(50) DEFAULT 'reception',
    last_visit_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_clinic_mrn UNIQUE(clinic_id, mrn)
);

CREATE INDEX IF NOT EXISTS idx_patients_clinic_id ON public.patients(clinic_id);
CREATE INDEX IF NOT EXISTS idx_patients_phone ON public.patients(phone);
CREATE INDEX IF NOT EXISTS idx_patients_name ON public.patients(first_name, last_name);
CREATE INDEX IF NOT EXISTS idx_patients_mrn ON public.patients(mrn);

-- ------------------------------------------------------------------------------
-- 5. PATIENT ASSIGNMENTS (Doctor Transfers & Primary Care)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.patient_assignments (
    id TEXT PRIMARY KEY,
    clinic_id TEXT NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    patient_id TEXT NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    doctor_id TEXT NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
    doctor_name VARCHAR(255),
    from_date TIMESTAMPTZ DEFAULT NOW(),
    to_date TIMESTAMPTZ,
    transferred_by VARCHAR(255),
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patient_assignments_clinic ON public.patient_assignments(clinic_id);
CREATE INDEX IF NOT EXISTS idx_patient_assignments_patient ON public.patient_assignments(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_assignments_doctor ON public.patient_assignments(doctor_id);

-- ------------------------------------------------------------------------------
-- 6. APPOINTMENTS (Scheduling, Queue, Token Management)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.appointments (
    id TEXT PRIMARY KEY,
    clinic_id TEXT NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    appointment_number VARCHAR(50) NOT NULL,
    patient_id TEXT NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    patient_name VARCHAR(255) NOT NULL,
    patient_phone VARCHAR(30),
    doctor_id TEXT NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
    doctor_name VARCHAR(255) NOT NULL,
    department VARCHAR(100),
    date_time TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER DEFAULT 15,
    status VARCHAR(30) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'checked_in', 'in_consultation', 'completed', 'cancelled', 'no_show')),
    reason_for_visit TEXT,
    chief_complaint TEXT,
    token_number INTEGER NOT NULL,
    consultation_room VARCHAR(50),
    source VARCHAR(30) DEFAULT 'reception',
    checked_in_at TIMESTAMPTZ,
    checked_in_by_id TEXT,
    checked_in_by_name VARCHAR(255),
    booked_by_id TEXT,
    booked_by_name VARCHAR(255),
    cancelled_at TIMESTAMPTZ,
    cancelled_by_id TEXT,
    cancelled_by_name VARCHAR(255),
    cancel_reason TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointments_clinic_date ON public.appointments(clinic_id, date_time);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON public.appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON public.appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);

-- ------------------------------------------------------------------------------
-- 7. VISITS (Clinical Encounters & Vitals)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.visits (
    id TEXT PRIMARY KEY,
    clinic_id TEXT NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    patient_id TEXT NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    appointment_id TEXT REFERENCES public.appointments(id) ON DELETE SET NULL,
    doctor_id TEXT NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
    visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
    reason TEXT,
    notes TEXT,
    systolic_bp INTEGER,
    diastolic_bp INTEGER,
    heart_rate_bpm INTEGER,
    respiratory_rate INTEGER,
    oxygen_saturation_pct NUMERIC(5, 2),
    temperature_celsius NUMERIC(4, 1),
    weight_kg NUMERIC(5, 2),
    height_cm NUMERIC(5, 1),
    bmi NUMERIC(4, 1),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visits_clinic_patient ON public.visits(clinic_id, patient_id);
CREATE INDEX IF NOT EXISTS idx_visits_doctor ON public.visits(doctor_id);

-- ------------------------------------------------------------------------------
-- 8. PRESCRIPTIONS (Master Electronic Prescription)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.prescriptions (
    id TEXT PRIMARY KEY,
    clinic_id TEXT NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    patient_id TEXT NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    doctor_id TEXT NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
    visit_id TEXT REFERENCES public.visits(id) ON DELETE SET NULL,
    diagnosis TEXT,
    notes TEXT,
    status VARCHAR(20) DEFAULT 'issued' CHECK (status IN ('draft', 'issued', 'dispensed', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prescriptions_clinic ON public.prescriptions(clinic_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON public.prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_visit ON public.prescriptions(visit_id);

-- ------------------------------------------------------------------------------
-- 9. PRESCRIPTION ITEMS (Itemized Medications)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.prescription_items (
    id TEXT PRIMARY KEY,
    prescription_id TEXT NOT NULL REFERENCES public.prescriptions(id) ON DELETE CASCADE,
    medicine_id TEXT,
    medicine_name VARCHAR(255) NOT NULL,
    strength VARCHAR(100),
    form VARCHAR(50),
    route VARCHAR(50),
    dose_amount NUMERIC(8, 2),
    dose_unit VARCHAR(50),
    frequency VARCHAR(50),
    timing VARCHAR(50),
    duration VARCHAR(50),
    quantity INTEGER DEFAULT 1,
    refills INTEGER DEFAULT 0,
    instructions VARCHAR(255),
    dispensed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prescription_items_prescription ON public.prescription_items(prescription_id);

-- ------------------------------------------------------------------------------
-- 10. INVOICES (Billing Master)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invoices (
    id TEXT PRIMARY KEY,
    clinic_id TEXT NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    invoice_number VARCHAR(50) NOT NULL,
    patient_id TEXT NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    patient_name VARCHAR(255) NOT NULL,
    doctor_id TEXT REFERENCES public.staff(id) ON DELETE SET NULL,
    doctor_name VARCHAR(255),
    invoice_date DATE DEFAULT CURRENT_DATE,
    subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    tax_amount NUMERIC(10, 2) DEFAULT 0.00,
    discount_amount NUMERIC(10, 2) DEFAULT 0.00,
    total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    paid_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(30) DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'partially_paid', 'paid', 'cancelled', 'refunded')),
    payment_method VARCHAR(30) CHECK (payment_method IN ('cash', 'card', 'insurance', 'bank_transfer', 'upi')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_clinic_date ON public.invoices(clinic_id, invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_patient ON public.invoices(patient_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);

-- ------------------------------------------------------------------------------
-- 11. INVOICE ITEMS (Line Items)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invoice_items (
    id TEXT PRIMARY KEY,
    invoice_id TEXT NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    description VARCHAR(255) NOT NULL,
    category VARCHAR(50) CHECK (category IN ('consultation', 'medication', 'lab_test', 'procedure', 'room', 'other')),
    unit_price NUMERIC(10, 2) NOT NULL,
    quantity INTEGER DEFAULT 1,
    total NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON public.invoice_items(invoice_id);

-- ------------------------------------------------------------------------------
-- 12. PAYMENTS (Receipts & Settlements)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payments (
    id TEXT PRIMARY KEY,
    clinic_id TEXT NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    invoice_id TEXT NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    patient_id TEXT NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    payment_date TIMESTAMPTZ DEFAULT NOW(),
    payment_method VARCHAR(30) NOT NULL CHECK (payment_method IN ('cash', 'card', 'insurance', 'bank_transfer', 'upi')),
    transaction_ref VARCHAR(100),
    recorded_by VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_clinic ON public.payments(clinic_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON public.payments(invoice_id);

-- ------------------------------------------------------------------------------
-- 13. ATTENDANCE (Clock-In / Clock-Out)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.attendance (
    id TEXT PRIMARY KEY,
    clinic_id TEXT NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    staff_id TEXT NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
    staff_name VARCHAR(255),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    clock_in TIMESTAMPTZ,
    clock_out TIMESTAMPTZ,
    working_hours NUMERIC(5, 2) DEFAULT 0.00,
    status VARCHAR(20) DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'half_day', 'on_leave')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_staff_date UNIQUE(clinic_id, staff_id, date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_clinic_date ON public.attendance(clinic_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_staff ON public.attendance(staff_id);

-- ------------------------------------------------------------------------------
-- 14. LEAVE REQUESTS (Applications & Approvals)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.leave_requests (
    id TEXT PRIMARY KEY,
    clinic_id TEXT NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    staff_id TEXT NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
    staff_name VARCHAR(255),
    leave_type VARCHAR(50) NOT NULL CHECK (leave_type IN ('annual', 'sick', 'casual', 'maternity', 'emergency', 'unpaid')),
    from_date DATE NOT NULL,
    to_date DATE NOT NULL,
    reason TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    decision_note TEXT,
    decided_by VARCHAR(255),
    decided_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leave_clinic ON public.leave_requests(clinic_id);
CREATE INDEX IF NOT EXISTS idx_leave_staff ON public.leave_requests(staff_id);
CREATE INDEX IF NOT EXISTS idx_leave_status ON public.leave_requests(status);

-- ------------------------------------------------------------------------------
-- 15. SHIFTS (Department Rosters)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shifts (
    id TEXT PRIMARY KEY,
    clinic_id TEXT NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    days TEXT[] DEFAULT '{"Monday","Tuesday","Wednesday","Thursday","Friday"}',
    department VARCHAR(100),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shifts_clinic ON public.shifts(clinic_id);

-- ------------------------------------------------------------------------------
-- 16. FORMULARY (Medications Catalog)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.formulary (
    id TEXT PRIMARY KEY,
    generic_name VARCHAR(255) NOT NULL,
    brand_names TEXT[] DEFAULT '{}',
    drug_class VARCHAR(50),
    form VARCHAR(50),
    strengths TEXT[] DEFAULT '{}',
    default_route VARCHAR(50) DEFAULT 'Oral',
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_formulary_generic_name ON public.formulary(generic_name);

-- ------------------------------------------------------------------------------
-- 17. ACCESS AUDIT LOG (Security & Compliance Ledger)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.access_audit_log (
    id TEXT PRIMARY KEY,
    clinic_id TEXT REFERENCES public.clinics(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    action VARCHAR(100) NOT NULL,
    staff_id TEXT,
    staff_name VARCHAR(255),
    authorized_by VARCHAR(255),
    reason TEXT,
    details TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_clinic ON public.access_audit_log(clinic_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON public.access_audit_log(timestamp DESC);

-- ------------------------------------------------------------------------------
-- 18. NOTIFICATIONS (In-App Clinical Alerts & Reminders)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
    id TEXT PRIMARY KEY,
    clinic_id TEXT REFERENCES public.clinics(id) ON DELETE CASCADE,
    recipient_id TEXT NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'general',
    is_read BOOLEAN DEFAULT FALSE,
    link_tab VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(is_read);

-- ------------------------------------------------------------------------------
-- SEED INITIAL CLINIC: Subiksham Speciality Hospital
-- ------------------------------------------------------------------------------
INSERT INTO public.clinics (id, name, code, sub_title, phone, email, address, city, state, postal_code, country, logo_url, status)
VALUES (
    'CLN-001',
    'Subiksham Speciality Hospital',
    'SUBIKSHAM',
    'SOEZY Clinic Operations',
    '+91 95432 79999',
    'operations@subiksham.local',
    '124 Health Avenue, Speciality Block',
    'Pune',
    'Maharashtra',
    '411001',
    'India',
    '/soezy-logo.png',
    'active'
) ON CONFLICT (id) DO NOTHING;
