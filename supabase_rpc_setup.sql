-- Supabase Complete Premium Schema Update with Custom Table Auth

-- Drop existing functions and tables to prevent conflicts
DROP FUNCTION IF EXISTS verify_pin_login(text, text);
DROP FUNCTION IF EXISTS get_license_details(text);
DROP FUNCTION IF EXISTS register_device(text, text, text);
DROP FUNCTION IF EXISTS upsert_certificate(jsonb);
DROP FUNCTION IF EXISTS ping_db();
DROP FUNCTION IF EXISTS reset_password_with_security_questions(text, text, text, text);
DROP FUNCTION IF EXISTS authenticate_user(text, text);
DROP FUNCTION IF EXISTS update_profile_setup(uuid, text, text, text, text, text);

DROP TABLE IF EXISTS devices CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;
DROP TABLE IF EXISTS certificates CASCADE;
DROP TABLE IF EXISTS equipment CASCADE;
DROP TABLE IF EXISTS licenses CASCADE;
DROP TABLE IF EXISTS branding CASCADE;

-- 1. LICENSES
CREATE TABLE licenses (
    code TEXT PRIMARY KEY, -- Generated format: [COMPANY]-XXXX-XXXX-XXXX
    tier TEXT NOT NULL CHECK (tier IN ('trial', 'pro', 'enterprise')),
    organization TEXT NOT NULL UNIQUE,
    seats INTEGER NOT NULL DEFAULT 2,
    activated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to licenses" ON licenses FOR SELECT USING (true);
CREATE POLICY "Allow system insert/update to licenses" ON licenses FOR ALL USING (true) WITH CHECK (true);

-- 2. DEVICES (Workstation seat binding)
CREATE TABLE devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    license_code TEXT NOT NULL REFERENCES licenses(code) ON DELETE CASCADE,
    device_name TEXT,
    hardware_id TEXT NOT NULL,
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    active BOOLEAN DEFAULT true,
    UNIQUE(license_code, hardware_id)
);

ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read access to devices" ON devices FOR SELECT USING (true);
CREATE POLICY "Allow all access to devices" ON devices FOR ALL USING (true) WITH CHECK (true);

-- 3. USER PROFILES (Custom standalone table, completely independent of auth.users)
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL, -- SHA-256 client-side hash of password/PIN
    role TEXT NOT NULL CHECK (role IN ('manager', 'inspector')),
    organization TEXT NOT NULL,
    force_password_change BOOLEAN DEFAULT true,
    security_question_1 TEXT,
    security_answer_hash_1 TEXT,
    security_question_2 TEXT,
    security_answer_hash_2 TEXT,
    expires_at TIMESTAMP WITH TIME ZONE, -- Inspector certification expiry date
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access to profiles" ON user_profiles FOR ALL USING (true) WITH CHECK (true);

-- 4. EQUIPMENT
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

-- 5. CERTIFICATES (ISSUED DOSSIERS WITH TEXT-ONLY STRUCTURE)
CREATE TABLE certificates (
    id TEXT PRIMARY KEY, -- Format: [COMP]-[INSP_INIT]-[MONTH]-[COUNTER]
    equipment_id TEXT NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
    equipment_tag TEXT NOT NULL,
    equipment_name TEXT NOT NULL,
    template_id TEXT NOT NULL,
    template_name TEXT NOT NULL,
    inspector_id TEXT NOT NULL,
    inspector_name TEXT NOT NULL,
    result TEXT NOT NULL,
    answers JSONB DEFAULT '{}'::jsonb,
    photos JSONB DEFAULT '[]'::jsonb, -- Kept as empty arrays as per text-only spec
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

-- 6. BRANDING & SECURITY SETTINGS
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
    pdf_sign_enabled BOOLEAN DEFAULT true,
    pdf_edit_lock_enabled BOOLEAN DEFAULT false,
    pdf_edit_password_hash TEXT,
    public_key TEXT, -- Cryptographic Ed25519 public key used for signature verification
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE branding ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access to branding" ON branding FOR ALL USING (true) WITH CHECK (true);

-- 7. DB HELPER FUNCTION: authenticate_user
CREATE OR REPLACE FUNCTION authenticate_user(p_username TEXT, p_password_hash TEXT)
RETURNS TABLE (
    id UUID,
    username TEXT,
    name TEXT,
    role TEXT,
    organization TEXT,
    force_password_change BOOLEAN
) SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT up.id, up.username, up.name, up.role::text, up.organization, up.force_password_change
    FROM user_profiles up
    WHERE LOWER(up.username) = LOWER(p_username)
      AND up.password_hash = p_password_hash;
END;
$$ LANGUAGE plpgsql;

-- 8. DB HELPER FUNCTION: update_profile_setup
CREATE OR REPLACE FUNCTION update_profile_setup(
    p_user_id UUID,
    p_new_password_hash TEXT,
    p_q1 TEXT,
    p_ans1_hash TEXT,
    p_q2 TEXT,
    p_ans2_hash TEXT
)
RETURNS BOOLEAN SECURITY DEFINER AS $$
BEGIN
    UPDATE user_profiles
    SET password_hash = p_new_password_hash,
        security_question_1 = p_q1,
        security_answer_hash_1 = p_ans1_hash,
        security_question_2 = p_q2,
        security_answer_hash_2 = p_ans2_hash,
        force_password_change = false
    WHERE id = p_user_id;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- 9. DB HELPER FUNCTION: reset_password_with_security_questions
CREATE OR REPLACE FUNCTION reset_password_with_security_questions(
    p_username TEXT,
    p_answer_hash_1 TEXT,
    p_answer_hash_2 TEXT,
    p_new_password_hash TEXT
)
RETURNS BOOLEAN SECURITY DEFINER AS $$
BEGIN
    UPDATE user_profiles
    SET password_hash = p_new_password_hash,
        force_password_change = false
    WHERE LOWER(username) = LOWER(p_username)
      AND security_answer_hash_1 = p_answer_hash_1
      AND security_answer_hash_2 = p_answer_hash_2;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- 10. DB HELPER FUNCTION: register_device
CREATE OR REPLACE FUNCTION register_device(p_code TEXT, p_hw_id TEXT, p_name TEXT)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT
) SECURITY DEFINER AS $$
DECLARE
    v_seats INTEGER;
    v_active_count INTEGER;
BEGIN
    -- Check if license exists and is active
    SELECT seats INTO v_seats FROM licenses WHERE code = p_code AND expires_at > now();
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'License key is invalid or expired'::text;
        RETURN;
    END IF;

    -- Check if device is already registered
    IF EXISTS (SELECT 1 FROM devices WHERE license_code = p_code AND hardware_id = p_hw_id AND active = true) THEN
        RETURN QUERY SELECT TRUE, 'Device already registered and active'::text;
        RETURN;
    END IF;

    -- Check active seats count
    SELECT COUNT(*)::INTEGER INTO v_active_count FROM devices WHERE license_code = p_code AND active = true;
    IF v_active_count >= v_seats THEN
        RETURN QUERY SELECT FALSE, 'Maximum seat limit reached for this license'::text;
        RETURN;
    END IF;

    -- Register / reactivate device
    INSERT INTO devices (license_code, hardware_id, device_name, active)
    VALUES (p_code, p_hw_id, p_name, true)
    ON CONFLICT (license_code, hardware_id) DO UPDATE SET active = true, device_name = p_name;

    RETURN QUERY SELECT TRUE, 'Device registered successfully'::text;
END;
$$ LANGUAGE plpgsql;

-- 11. DB HELPER FUNCTION: get_license_details
CREATE OR REPLACE FUNCTION get_license_details(p_code TEXT)
RETURNS TABLE (
    code TEXT,
    tier TEXT,
    organization TEXT,
    seats INTEGER,
    expires_at TIMESTAMP WITH TIME ZONE,
    activated_at TIMESTAMP WITH TIME ZONE
) SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT l.code, l.tier, l.organization, l.seats, l.expires_at, l.activated_at
    FROM licenses l
    WHERE l.code = p_code AND l.expires_at > now();
END;
$$ LANGUAGE plpgsql;

-- 12. DB HELPER FUNCTION: upsert_certificate
CREATE OR REPLACE FUNCTION upsert_certificate(p_payload JSONB)
RETURNS VOID SECURITY DEFINER AS $$
BEGIN
    INSERT INTO certificates (
        id, equipment_id, equipment_tag, equipment_name,
        template_id, template_name, inspector_id, inspector_name,
        result, answers, photos, valid_until, hash, equipment_category,
        standard_ids, spec, checklist, ndt, defects, test_equipment_ids, issued_at
    ) VALUES (
        p_payload->>'id',
        p_payload->>'equipmentId',
        p_payload->>'equipmentTag',
        p_payload->>'equipmentName',
        p_payload->>'templateId',
        p_payload->>'templateName',
        p_payload->>'inspectorId',
        p_payload->>'inspectorName',
        p_payload->>'result',
        (p_payload->'answers'),
        '[]'::jsonb, -- Force text-only jsonb representation (no files)
        (p_payload->>'validUntil')::timestamp with time zone,
        p_payload->>'hash',
        p_payload->>'equipmentCategory',
        (p_payload->'standardIds'),
        (p_payload->'spec'),
        (p_payload->'checklist'),
        (p_payload->'ndt'),
        (p_payload->'defects'),
        (p_payload->'testEquipmentIds'),
        (p_payload->>'issuedAt')::timestamp with time zone
    )
    ON CONFLICT (id) DO UPDATE SET
        result = EXCLUDED.result,
        answers = EXCLUDED.answers,
        spec = EXCLUDED.spec,
        checklist = EXCLUDED.checklist,
        ndt = EXCLUDED.ndt,
        defects = EXCLUDED.defects;
END;
$$ LANGUAGE plpgsql;

-- 13. DB HELPER FUNCTION: ping_db
CREATE OR REPLACE FUNCTION ping_db()
RETURNS BOOLEAN SECURITY DEFINER AS $$
BEGIN
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 14. DB HELPER FUNCTION: generate_license_and_manager
CREATE OR REPLACE FUNCTION generate_license_and_manager(
    p_company_name TEXT,
    p_manager_name TEXT,
    p_seats INTEGER,
    p_expires_at TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE (
    activation_code TEXT,
    manager_username TEXT,
    default_password TEXT
) SECURITY DEFINER AS $$
DECLARE
    v_prefix TEXT;
    v_random_code TEXT;
    v_final_code TEXT;
    v_first_name TEXT;
    v_last_initial TEXT;
    v_username TEXT;
    v_default_password TEXT := '1234';
    v_password_hash TEXT := '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4'; -- SHA-256 for '1234'
BEGIN
    -- 1. Extract first 4 chars of company name, upper cased, replacing spaces
    v_prefix := UPPER(SUBSTRING(REGEXP_REPLACE(p_company_name, '\s+', '', 'g') FROM 1 FOR 4));
    IF LENGTH(v_prefix) < 4 THEN
        v_prefix := RPAD(v_prefix, 4, 'X');
    END IF;

    -- 2. Generate 12 random alphanumeric characters in XXXX-XXXX-XXXX format
    v_random_code := UPPER(
        SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4) || '-' ||
        SUBSTRING(MD5(RANDOM()::TEXT) FROM 5 FOR 4) || '-' ||
        SUBSTRING(MD5(RANDOM()::TEXT) FROM 9 FOR 4)
    );
    v_final_code := v_prefix || '-' || v_random_code;

    -- 3. Construct Manager Username: first name (up to 4 chars) + last name initial + @mgr
    -- Split name by space
    v_first_name := LOWER(SPLIT_PART(p_manager_name, ' ', 1));
    v_first_name := SUBSTRING(v_first_name FROM 1 FOR 4);
    
    v_last_initial := LOWER(SUBSTRING(SPLIT_PART(p_manager_name, ' ', 2) FROM 1 FOR 1));
    IF v_last_initial = '' THEN
        v_last_initial := 'x';
    END IF;
    
    v_username := v_first_name || v_last_initial || '@mgr';

    -- 4. Insert into licenses table
    INSERT INTO licenses (code, tier, organization, seats, expires_at)
    VALUES (v_final_code, 'enterprise', p_company_name, p_seats, p_expires_at);

    -- 5. Insert into user_profiles table
    INSERT INTO user_profiles (username, name, password_hash, role, organization, force_password_change)
    VALUES (v_username, p_manager_name, v_password_hash, 'manager', p_company_name, true);

    -- 6. Return values
    activation_code := v_final_code;
    manager_username := v_username;
    default_password := v_default_password;
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;
