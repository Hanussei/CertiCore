-- DROP EXISTING TABLES (Fresh Start)
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS certificates CASCADE;
DROP TABLE IF EXISTS equipment CASCADE;
DROP TABLE IF EXISTS licenses CASCADE;
DROP TABLE IF EXISTS branding CASCADE;

-- 1. LICENSES
CREATE TABLE licenses (
    code TEXT PRIMARY KEY,
    tier TEXT NOT NULL CHECK (tier IN ('trial', 'pro', 'enterprise')),
    organization TEXT NOT NULL,
    seats INTEGER NOT NULL DEFAULT 2,
    activated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    machine_id TEXT
);

-- Enable RLS and insert open access for testing
ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to licenses" ON licenses FOR SELECT USING (true);
CREATE POLICY "Allow system insert/update to licenses" ON licenses FOR ALL USING (true) WITH CHECK (true);

-- 2. EQUIPMENT
CREATE TABLE equipment (
    id TEXT PRIMARY KEY,
    tag TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    category TEXT,
    manufacturer TEXT,
    serial_number TEXT,
    site TEXT,
    working_load TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    last_inspected_at TIMESTAMP WITH TIME ZONE,
    next_inspection_due TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    equipment_category TEXT,
    spec JSONB DEFAULT '{}'::jsonb
);

ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access to equipment" ON equipment FOR ALL USING (true) WITH CHECK (true);

-- 3. CERTIFICATES (ISSUED DOSSIERS)
CREATE TABLE certificates (
    id TEXT PRIMARY KEY,
    equipment_id TEXT NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
    equipment_tag TEXT NOT NULL,
    equipment_name TEXT NOT NULL,
    template_id TEXT NOT NULL,
    template_name TEXT NOT NULL,
    inspector_id TEXT NOT NULL,
    inspector_name TEXT NOT NULL,
    result TEXT NOT NULL,
    answers JSONB DEFAULT '{}'::jsonb,
    photos JSONB DEFAULT '[]'::jsonb,
    issued_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    valid_until TIMESTAMP WITH TIME ZONE NOT NULL,
    hash TEXT NOT NULL,
    equipment_category TEXT,
    standard_ids JSONB DEFAULT '[]'::jsonb,
    spec JSONB DEFAULT '{}'::jsonb,
    checklist JSONB DEFAULT '[]'::jsonb,
    ndt JSONB DEFAULT '[]'::jsonb,
    defects JSONB DEFAULT '[]'::jsonb,
    test_equipment_ids JSONB DEFAULT '[]'::jsonb
);

ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access to certificates" ON certificates FOR ALL USING (true) WITH CHECK (true);

-- 4. AUDIT LOGS
CREATE TABLE audit_logs (
    id TEXT PRIMARY KEY,
    actor TEXT NOT NULL,
    actor_role TEXT NOT NULL,
    action TEXT NOT NULL,
    target TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('info', 'success', 'warning', 'critical')),
    category TEXT NOT NULL,
    detail TEXT,
    ip TEXT,
    at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access to audit_logs" ON audit_logs FOR ALL USING (true) WITH CHECK (true);

-- 5. BRANDING
CREATE TABLE branding (
    id TEXT PRIMARY KEY DEFAULT 'global',
    organization_name TEXT NOT NULL,
    organization_name_ar TEXT,
    registration_no TEXT,
    address_line1 TEXT,
    address_line2 TEXT,
    phone TEXT,
    email TEXT,
    website TEXT,
    primary_color TEXT,
    accent_color TEXT,
    footer_text TEXT,
    footer_text_ar TEXT,
    logo_data_url TEXT,
    manager_name TEXT,
    manager_title TEXT,
    manager_signature_data_url TEXT,
    stamp_data_url TEXT,
    accreditations TEXT,
    accreditation_logos JSONB DEFAULT '[]'::jsonb,
    watermark_enabled BOOLEAN DEFAULT true,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE branding ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access to branding" ON branding FOR ALL USING (true) WITH CHECK (true);

-- 6. SEED FIRST LICENSE
INSERT INTO licenses (code, tier, organization, seats, expires_at)
VALUES ('CERT-REAL-2026-KEY1', 'enterprise', 'WHO CARES Engineering', 50, '2030-01-01 00:00:00+00');
