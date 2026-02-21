-- ================================================
-- ONBOARDLY V2 DATABASE SCHEMA
-- Drop old schema and recreate with full 11-table spec
-- Run this in Supabase SQL Editor
-- ================================================

-- Drop existing tables in dependency order
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS set_projects_updated_at ON public.projects;
DROP TRIGGER IF EXISTS set_checklist_items_updated_at ON public.checklist_items;
DROP TRIGGER IF EXISTS set_form_responses_updated_at ON public.form_responses;

DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.set_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.user_can_access_project CASCADE;

DROP TABLE IF EXISTS public.reminder_logs CASCADE;
DROP TABLE IF EXISTS public.activity_logs CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.contracts CASCADE;
DROP TABLE IF EXISTS public.files CASCADE;
DROP TABLE IF EXISTS public.form_responses CASCADE;
DROP TABLE IF EXISTS public.checklist_items CASCADE;
DROP TABLE IF EXISTS public.projects CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- ================================================
-- 1. PROFILES
-- ================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('designer', 'client')),
  avatar_url TEXT,
  business_name TEXT,
  phone TEXT,
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_profiles_email ON public.profiles(email);

-- ================================================
-- 2. PROJECTS
-- ================================================
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  designer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  client_email TEXT NOT NULL,
  client_name TEXT,
  name TEXT NOT NULL,
  description TEXT,
  project_type TEXT CHECK (project_type IN ('website', 'branding', 'ui_ux', 'marketing', 'other')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'invited', 'onboarding', 'ready',
    'in_progress', 'review', 'completed', 'archived'
  )),
  magic_link_token UUID DEFAULT gen_random_uuid() UNIQUE,
  progress_percentage INT NOT NULL DEFAULT 0 CHECK (progress_percentage BETWEEN 0 AND 100),
  deposit_amount NUMERIC(12, 2),
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_projects_designer_id ON public.projects(designer_id);
CREATE INDEX idx_projects_client_id ON public.projects(client_id);
CREATE INDEX idx_projects_client_email ON public.projects(client_email);
CREATE INDEX idx_projects_status ON public.projects(status);
CREATE INDEX idx_projects_magic_link ON public.projects(magic_link_token);

-- ================================================
-- 3. CHECKLIST ITEMS
-- ================================================
CREATE TABLE public.checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('form', 'file', 'contract', 'payment', 'task', 'approval')),
  config JSONB NOT NULL DEFAULT '{}',
  is_required BOOLEAN NOT NULL DEFAULT true,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_checklist_project ON public.checklist_items(project_id);
CREATE INDEX idx_checklist_sort ON public.checklist_items(project_id, sort_order);

-- ================================================
-- 4. FORM RESPONSES
-- ================================================
CREATE TABLE public.form_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  checklist_item_id UUID NOT NULL REFERENCES public.checklist_items(id) ON DELETE CASCADE,
  responses JSONB NOT NULL DEFAULT '{}',
  is_draft BOOLEAN NOT NULL DEFAULT false,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_form_resp_project ON public.form_responses(project_id);
CREATE INDEX idx_form_resp_item ON public.form_responses(checklist_item_id);

-- ================================================
-- 5. FILES
-- ================================================
CREATE TABLE public.files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  checklist_item_id UUID REFERENCES public.checklist_items(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  file_type TEXT,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'upload' CHECK (category IN ('upload', 'deliverable', 'contract', 'other')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_files_project ON public.files(project_id);
CREATE INDEX idx_files_item ON public.files(checklist_item_id);

-- ================================================
-- 6. CONTRACTS
-- ================================================
CREATE TABLE public.contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  checklist_item_id UUID REFERENCES public.checklist_items(id) ON DELETE SET NULL,
  provider TEXT NOT NULL DEFAULT 'manual',
  external_id TEXT,
  template_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'viewed', 'signed', 'declined')),
  signed_at TIMESTAMPTZ,
  document_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_contracts_project ON public.contracts(project_id);

-- ================================================
-- 7. PAYMENTS
-- ================================================
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  checklist_item_id UUID REFERENCES public.checklist_items(id) ON DELETE SET NULL,
  stripe_payment_intent_id TEXT,
  stripe_checkout_session_id TEXT,
  amount NUMERIC(12, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'refunded')),
  description TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payments_project ON public.payments(project_id);
CREATE INDEX idx_payments_status ON public.payments(status);

-- ================================================
-- 8. MESSAGES
-- ================================================
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  attachment_url TEXT,
  attachment_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_project ON public.messages(project_id);
CREATE INDEX idx_messages_created ON public.messages(project_id, created_at DESC);

-- ================================================
-- 9. NOTIFICATIONS
-- ================================================
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  action_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON public.notifications(user_id);
CREATE INDEX idx_notifications_unread ON public.notifications(user_id, is_read);

-- ================================================
-- 10. ACTIVITY LOGS
-- ================================================
CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activity_project ON public.activity_logs(project_id);
CREATE INDEX idx_activity_created ON public.activity_logs(project_id, created_at DESC);

-- ================================================
-- 11. REMINDER LOGS
-- ================================================
CREATE TABLE public.reminder_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  checklist_item_id UUID REFERENCES public.checklist_items(id) ON DELETE SET NULL,
  recipient_email TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'email',
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reminder_project ON public.reminder_logs(project_id);

-- ================================================
-- FUNCTIONS & TRIGGERS
-- ================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_projects_updated BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_checklist_updated BEFORE UPDATE ON public.checklist_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_form_resp_updated BEFORE UPDATE ON public.form_responses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_contracts_updated BEFORE UPDATE ON public.contracts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_payments_updated BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, business_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'client'),
    COALESCE(NEW.raw_user_meta_data->>'business_name', '')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), public.profiles.full_name),
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Calculate project progress
CREATE OR REPLACE FUNCTION public.calculate_project_progress(p_project_id UUID)
RETURNS INT AS $$
DECLARE
  total_items INT;
  completed_items INT;
BEGIN
  SELECT COUNT(*), COALESCE(SUM(CASE WHEN is_completed THEN 1 ELSE 0 END), 0)
  INTO total_items, completed_items
  FROM public.checklist_items
  WHERE project_id = p_project_id AND is_required = true;

  IF total_items = 0 THEN RETURN 0; END IF;
  RETURN ROUND((completed_items::DECIMAL / total_items) * 100);
END;
$$ LANGUAGE plpgsql;

-- Auto-update progress when checklist changes
CREATE OR REPLACE FUNCTION public.update_project_progress()
RETURNS TRIGGER AS $$
DECLARE
  p_id UUID;
  new_progress INT;
BEGIN
  p_id := COALESCE(NEW.project_id, OLD.project_id);
  new_progress := public.calculate_project_progress(p_id);

  UPDATE public.projects
  SET progress_percentage = new_progress,
      status = CASE
        WHEN new_progress = 100 AND status = 'onboarding' THEN 'ready'
        ELSE status
      END
  WHERE id = p_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_progress_update
  AFTER INSERT OR UPDATE OR DELETE ON public.checklist_items
  FOR EACH ROW EXECUTE FUNCTION public.update_project_progress();

-- ================================================
-- ROW LEVEL SECURITY
-- ================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminder_logs ENABLE ROW LEVEL SECURITY;

-- Helper: check if user can access project
CREATE OR REPLACE FUNCTION public.can_access_project(p_project_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = p_project_id
      AND (
        designer_id = auth.uid()
        OR client_id = auth.uid()
        OR client_email = (SELECT email FROM auth.users WHERE id = auth.uid())
      )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- PROFILES
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (id = auth.uid());

-- PROJECTS
CREATE POLICY "projects_select" ON public.projects FOR SELECT
  USING (designer_id = auth.uid() OR client_id = auth.uid() OR client_email = (SELECT email FROM auth.users WHERE id = auth.uid()));
CREATE POLICY "projects_insert" ON public.projects FOR INSERT WITH CHECK (designer_id = auth.uid());
CREATE POLICY "projects_update" ON public.projects FOR UPDATE USING (designer_id = auth.uid());
CREATE POLICY "projects_delete" ON public.projects FOR DELETE USING (designer_id = auth.uid());

-- CHECKLIST ITEMS
CREATE POLICY "checklist_select" ON public.checklist_items FOR SELECT USING (public.can_access_project(project_id));
CREATE POLICY "checklist_insert" ON public.checklist_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND designer_id = auth.uid())
);
CREATE POLICY "checklist_update" ON public.checklist_items FOR UPDATE USING (public.can_access_project(project_id));
CREATE POLICY "checklist_delete" ON public.checklist_items FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND designer_id = auth.uid())
);

-- FORM RESPONSES
CREATE POLICY "form_resp_select" ON public.form_responses FOR SELECT USING (public.can_access_project(project_id));
CREATE POLICY "form_resp_insert" ON public.form_responses FOR INSERT WITH CHECK (public.can_access_project(project_id));
CREATE POLICY "form_resp_update" ON public.form_responses FOR UPDATE USING (public.can_access_project(project_id));

-- FILES
CREATE POLICY "files_select" ON public.files FOR SELECT USING (public.can_access_project(project_id));
CREATE POLICY "files_insert" ON public.files FOR INSERT WITH CHECK (public.can_access_project(project_id));
CREATE POLICY "files_delete" ON public.files FOR DELETE USING (uploaded_by = auth.uid());

-- CONTRACTS
CREATE POLICY "contracts_select" ON public.contracts FOR SELECT USING (public.can_access_project(project_id));
CREATE POLICY "contracts_insert" ON public.contracts FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND designer_id = auth.uid())
);
CREATE POLICY "contracts_update" ON public.contracts FOR UPDATE USING (public.can_access_project(project_id));

-- PAYMENTS
CREATE POLICY "payments_select" ON public.payments FOR SELECT USING (public.can_access_project(project_id));
CREATE POLICY "payments_insert" ON public.payments FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND designer_id = auth.uid())
);
CREATE POLICY "payments_update" ON public.payments FOR UPDATE USING (public.can_access_project(project_id));

-- MESSAGES
CREATE POLICY "messages_select" ON public.messages FOR SELECT USING (public.can_access_project(project_id));
CREATE POLICY "messages_insert" ON public.messages FOR INSERT WITH CHECK (sender_id = auth.uid() AND public.can_access_project(project_id));

-- NOTIFICATIONS
CREATE POLICY "notifications_select" ON public.notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "notifications_update" ON public.notifications FOR UPDATE USING (user_id = auth.uid());

-- ACTIVITY LOGS
CREATE POLICY "activity_select" ON public.activity_logs FOR SELECT USING (public.can_access_project(project_id));
CREATE POLICY "activity_insert" ON public.activity_logs FOR INSERT WITH CHECK (public.can_access_project(project_id));

-- REMINDER LOGS
CREATE POLICY "reminder_select" ON public.reminder_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND designer_id = auth.uid())
);
