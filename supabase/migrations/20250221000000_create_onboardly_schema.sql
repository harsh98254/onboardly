-- Onboardly: Client onboarding portal for freelance designers
-- Run this in Supabase SQL Editor or via: supabase db push

-- Enable UUID extension if not already
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. profiles (extends auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL CHECK (role IN ('designer', 'client')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. projects
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  designer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  client_email TEXT NOT NULL,
  client_name TEXT,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'onboarding' CHECK (status IN ('onboarding', 'active', 'completed')),
  deposit_amount NUMERIC(12, 2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. checklist_items
CREATE TABLE public.checklist_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('form', 'file', 'contract', 'payment')),
  is_required BOOLEAN NOT NULL DEFAULT true,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. form_responses
CREATE TABLE public.form_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  checklist_item_id UUID NOT NULL REFERENCES public.checklist_items(id) ON DELETE CASCADE,
  responses JSONB NOT NULL DEFAULT '{}',
  submitted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, checklist_item_id)
);

-- 5. files
CREATE TABLE public.files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  checklist_item_id UUID NOT NULL REFERENCES public.checklist_items(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_projects_designer_id ON public.projects(designer_id);
CREATE INDEX idx_projects_client_id ON public.projects(client_id);
CREATE INDEX idx_projects_client_email ON public.projects(client_email);
CREATE INDEX idx_checklist_items_project_id ON public.checklist_items(project_id);
CREATE INDEX idx_form_responses_project_id ON public.form_responses(project_id);
CREATE INDEX idx_files_project_id ON public.files(project_id);

-- Trigger: auto-create profile on signup (optional but recommended)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'client')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Only create trigger if auth.users exists (Supabase has it)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ========== ROW LEVEL SECURITY ==========
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

-- Helper: true if current user can access a project (designer or invited client)
CREATE OR REPLACE FUNCTION public.user_can_access_project(project_row public.projects)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    project_row.designer_id = auth.uid()
    OR project_row.client_id = auth.uid()
    OR (SELECT auth.jwt()->>'email') = project_row.client_email
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- profiles: users can read/update their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid());

-- projects: designers full access to own; clients read/update for invited projects
CREATE POLICY "Designers can do all on own projects"
  ON public.projects
  FOR ALL
  USING (designer_id = auth.uid())
  WITH CHECK (designer_id = auth.uid());

CREATE POLICY "Clients can view invited projects"
  ON public.projects FOR SELECT
  USING (
    client_id = auth.uid()
    OR (SELECT auth.jwt()->>'email') = client_email
  );

CREATE POLICY "Clients can update invited projects (e.g. status)"
  ON public.projects FOR UPDATE
  USING (
    client_id = auth.uid()
    OR (SELECT auth.jwt()->>'email') = client_email
  );

-- checklist_items: access via project
CREATE POLICY "Designers can manage checklist items on own projects"
  ON public.checklist_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = checklist_items.project_id AND p.designer_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = checklist_items.project_id AND p.designer_id = auth.uid()
    )
  );

CREATE POLICY "Clients can view and update checklist items on invited projects"
  ON public.checklist_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = checklist_items.project_id
        AND (p.client_id = auth.uid() OR (SELECT auth.jwt()->>'email') = p.client_email)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = checklist_items.project_id
        AND (p.client_id = auth.uid() OR (SELECT auth.jwt()->>'email') = p.client_email)
    )
  );

-- form_responses: view/submit for project participants
CREATE POLICY "Designers can manage form responses on own projects"
  ON public.form_responses
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = form_responses.project_id AND p.designer_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = form_responses.project_id AND p.designer_id = auth.uid()
    )
  );

CREATE POLICY "Clients can view and insert form responses on invited projects"
  ON public.form_responses
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = form_responses.project_id
        AND (p.client_id = auth.uid() OR (SELECT auth.jwt()->>'email') = p.client_email)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = form_responses.project_id
        AND (p.client_id = auth.uid() OR (SELECT auth.jwt()->>'email') = p.client_email)
    )
  );

-- files: same as form_responses
CREATE POLICY "Designers can manage files on own projects"
  ON public.files
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = files.project_id AND p.designer_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = files.project_id AND p.designer_id = auth.uid()
    )
  );

CREATE POLICY "Clients can view and upload files on invited projects"
  ON public.files
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = files.project_id
        AND (p.client_id = auth.uid() OR (SELECT auth.jwt()->>'email') = p.client_email)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = files.project_id
        AND (p.client_id = auth.uid() OR (SELECT auth.jwt()->>'email') = p.client_email)
    )
  );

-- Optional: updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
CREATE TRIGGER set_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
CREATE TRIGGER set_checklist_items_updated_at
  BEFORE UPDATE ON public.checklist_items
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
CREATE TRIGGER set_form_responses_updated_at
  BEFORE UPDATE ON public.form_responses
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
