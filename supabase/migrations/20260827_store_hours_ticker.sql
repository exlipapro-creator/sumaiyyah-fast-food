-- ==============================================================================
-- SUMAIYYAH FAST FOOD / TOP KITCHEN LIVE
-- Supabase Schema & Realtime Setup: Store Hours & Header Ticker Engine
-- ==============================================================================

-- 1. Store Settings & Operating Hours
CREATE TABLE IF NOT EXISTS public.store_settings (
  id INT PRIMARY KEY DEFAULT 1,
  is_manual_override BOOLEAN DEFAULT FALSE,
  manual_status TEXT CHECK (manual_status IN ('OPEN', 'CLOSED')) DEFAULT 'OPEN',
  opening_time TIME NOT NULL DEFAULT '08:00:00',
  closing_time TIME NOT NULL DEFAULT '23:00:00',
  timezone TEXT DEFAULT 'Africa/Dar_es_Salaam',
  default_fallback_text TEXT DEFAULT 'Top Kitchen Live — Fresh Meals & Juices Delivered Daily across Dar es Salaam',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);

-- Seed default singleton row if not exists
INSERT INTO public.store_settings (id, is_manual_override, manual_status, opening_time, closing_time, timezone, default_fallback_text)
VALUES (1, FALSE, 'OPEN', '08:00:00', '23:00:00', 'Africa/Dar_es_Salaam', 'Top Kitchen Live — Fresh Meals & Juices Delivered Daily across Dar es Salaam')
ON CONFLICT (id) DO NOTHING;

-- 2. Ticker Announcements Table
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text TEXT NOT NULL,
  highlight TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  priority INT DEFAULT 1,
  start_time TIMESTAMPTZ DEFAULT NOW(),
  end_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_announcements_active_priority 
ON public.announcements (is_active, priority ASC, created_at DESC);

-- Enable Supabase Realtime replication on both tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.store_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;

-- ==============================================================================
-- Computed Store Status & Announcement RPC (api_functions.sql)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.get_header_ticker_data()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_settings RECORD;
  v_current_time TIME;
  v_is_open BOOLEAN;
  v_announcements JSONB;
BEGIN
  -- Fetch Store Settings (or default fallback)
  SELECT * INTO v_settings FROM public.store_settings WHERE id = 1;
  
  IF NOT FOUND THEN
    INSERT INTO public.store_settings (id) VALUES (1) RETURNING * INTO v_settings;
  END IF;

  -- Determine local time based on configured timezone (defaults to Africa/Dar_es_Salaam)
  v_current_time := (NOW() AT TIME ZONE COALESCE(v_settings.timezone, 'Africa/Dar_es_Salaam'))::TIME;

  -- Calculate Open/Closed Status
  IF v_settings.is_manual_override THEN
    v_is_open := (v_settings.manual_status = 'OPEN');
  ELSE
    IF v_settings.opening_time <= v_settings.closing_time THEN
      v_is_open := (v_current_time >= v_settings.opening_time AND v_current_time < v_settings.closing_time);
    ELSE
      -- Handles overnight schedules (e.g., 20:00 to 04:00)
      v_is_open := (v_current_time >= v_settings.opening_time OR v_current_time < v_settings.closing_time);
    END IF;
  END IF;

  -- Fetch Active Announcements sorted by priority and recency
  SELECT COALESCE(jsonb_agg(to_jsonb(a)), '[]'::jsonb)
  INTO v_announcements
  FROM (
    SELECT id, text, highlight, priority, is_active, start_time, end_time
    FROM public.announcements
    WHERE is_active = TRUE
      AND (start_time IS NULL OR start_time <= NOW())
      AND (end_time IS NULL OR end_time >= NOW())
    ORDER BY priority ASC, created_at DESC
  ) a;

  RETURN jsonb_build_object(
    'is_open', v_is_open,
    'status_label', CASE WHEN v_is_open THEN 'LIVE' ELSE 'CLOSED' END,
    'default_fallback_text', v_settings.default_fallback_text,
    'opening_time', v_settings.opening_time,
    'closing_time', v_settings.closing_time,
    'timezone', v_settings.timezone,
    'is_manual_override', v_settings.is_manual_override,
    'manual_status', v_settings.manual_status,
    'current_local_time', to_char(v_current_time, 'HH24:MI:SS'),
    'announcements', v_announcements
  );
END;
$$;

-- ==============================================================================
-- Row-Level Security Policies (rls.sql)
-- ==============================================================================
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Public read access for ticker display
CREATE POLICY "Public read announcements" ON public.announcements FOR SELECT USING (true);
CREATE POLICY "Public read store settings" ON public.store_settings FOR SELECT USING (true);

-- Admin write access control
CREATE POLICY "Admin write announcements" ON public.announcements 
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin' OR (auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true);

CREATE POLICY "Admin update store settings" ON public.store_settings 
  FOR UPDATE USING (auth.jwt() ->> 'role' = 'admin' OR (auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true);
