-- ==============================================================================
-- SoezyCMS — Migration: Organizations, Licensing, Facilities & Multi-Branch
-- Run this script in Supabase Dashboard -> SQL Editor
-- ==============================================================================

-- 1. Create Organizations Table
CREATE TABLE IF NOT EXISTS public.organizations (
    id TEXT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    headquarters_address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'India',
    phone VARCHAR(30),
    email VARCHAR(255),
    website VARCHAR(255),
    logo_url TEXT DEFAULT '/soezy-logo.png',
    
    -- Licensing & Subscription
    license_tier VARCHAR(50) DEFAULT 'enterprise' CHECK (license_tier IN ('starter', 'professional', 'enterprise', 'custom')),
    license_number VARCHAR(100) UNIQUE NOT NULL,
    license_valid_until TIMESTAMPTZ NOT NULL,
    license_status VARCHAR(20) DEFAULT 'active' CHECK (license_status IN ('active', 'expiring_soon', 'expired', 'suspended')),
    max_branches INTEGER DEFAULT 5,
    max_doctors INTEGER DEFAULT 50,
    
    -- Facility Modules Enabled (OPD, IPD, Pharmacy, Laboratory, Emergency, Billing)
    facilities TEXT[] DEFAULT '{"OPD","IPD","Pharmacy","Laboratory","Emergency","Billing"}',
    
    -- Appointed Primary Administrator
    appointed_admin_id TEXT,
    appointed_admin_name VARCHAR(255),
    appointed_admin_email VARCHAR(255),
    
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'trial', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_organizations_code ON public.organizations(code);
CREATE INDEX IF NOT EXISTS idx_organizations_license_status ON public.organizations(license_status);

-- 2. Add organization_id column to clinics (Branches) if not present
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'clinics' AND column_name = 'organization_id'
    ) THEN
        ALTER TABLE public.clinics ADD COLUMN organization_id TEXT REFERENCES public.organizations(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_clinics_organization ON public.clinics(organization_id);
    END IF;
END $$;

-- 3. Row Level Security Policies for Organizations
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public select on organizations" ON public.organizations;
CREATE POLICY "Public select on organizations" ON public.organizations FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public insert on organizations" ON public.organizations;
CREATE POLICY "Public insert on organizations" ON public.organizations FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Public update on organizations" ON public.organizations;
CREATE POLICY "Public update on organizations" ON public.organizations FOR UPDATE USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Public delete on organizations" ON public.organizations;
CREATE POLICY "Public delete on organizations" ON public.organizations FOR DELETE USING (true);

-- 4. Seed Initial Organization: Subiksham Healthcare Group
INSERT INTO public.organizations (
    id,
    name,
    code,
    headquarters_address,
    city,
    state,
    postal_code,
    country,
    phone,
    email,
    license_tier,
    license_number,
    license_valid_until,
    license_status,
    max_branches,
    max_doctors,
    facilities,
    appointed_admin_id,
    appointed_admin_name,
    appointed_admin_email,
    status
) VALUES (
    'ORG-001',
    'Subiksham Healthcare Group',
    'SUBIKSHAM',
    '124 Health Avenue, Speciality Block',
    'Pune',
    'Maharashtra',
    '411001',
    'India',
    '+91 95432 79999',
    'governance@subiksham.local',
    'enterprise',
    'MED-LIC-MH-2026-001',
    NOW() + INTERVAL '365 days',
    'active',
    5,
    50,
    ARRAY['OPD','IPD','Pharmacy','Laboratory','Emergency','Billing'],
    'acc-adm-1',
    'Meera Krishnan',
    'admin@subiksham.local',
    'active'
) ON CONFLICT (id) DO UPDATE SET
    facilities = EXCLUDED.facilities,
    license_status = EXCLUDED.license_status,
    updated_at = NOW();

-- 5. Link existing clinic CLN-001 to ORG-001
UPDATE public.clinics
SET organization_id = 'ORG-001'
WHERE id = 'CLN-001' AND (organization_id IS NULL OR organization_id = 'ORG-001');

