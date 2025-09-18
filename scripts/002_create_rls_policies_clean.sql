-- Clean RLS Policies Setup for CivicConnect
-- This script drops existing policies and recreates them to avoid conflicts

-- Drop all existing policies first
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Drop all policies on all tables
    FOR r IN (
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issue_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.civic_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issue_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issue_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issue_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_admin_roles ENABLE ROW LEVEL SECURITY;

-- Added clean policy creation with proper error handling
-- Profiles policies
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "profiles_delete_own" ON public.profiles
  FOR DELETE USING (auth.uid() = id);

CREATE POLICY "profiles_public_read" ON public.profiles
  FOR SELECT USING (true);

-- Issue categories policies
CREATE POLICY "issue_categories_public_read" ON public.issue_categories
  FOR SELECT USING (true);

CREATE POLICY "issue_categories_admin_manage" ON public.issue_categories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_admin_roles uar
      JOIN public.admin_roles ar ON uar.role_id = ar.id
      WHERE uar.user_id = auth.uid() AND 'manage_categories' = ANY(ar.permissions)
    )
  );

-- Civic issues policies
CREATE POLICY "civic_issues_public_read" ON public.civic_issues
  FOR SELECT USING (true);

CREATE POLICY "civic_issues_insert_authenticated" ON public.civic_issues
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "civic_issues_update_own" ON public.civic_issues
  FOR UPDATE USING (
    auth.uid() = reporter_id OR 
    EXISTS (
      SELECT 1 FROM public.user_admin_roles uar
      JOIN public.admin_roles ar ON uar.role_id = ar.id
      WHERE uar.user_id = auth.uid() AND 'manage_issues' = ANY(ar.permissions)
    )
  );

CREATE POLICY "civic_issues_delete_own_or_admin" ON public.civic_issues
  FOR DELETE USING (
    auth.uid() = reporter_id OR 
    EXISTS (
      SELECT 1 FROM public.user_admin_roles uar
      JOIN public.admin_roles ar ON uar.role_id = ar.id
      WHERE uar.user_id = auth.uid() AND 'manage_issues' = ANY(ar.permissions)
    )
  );

-- Issue votes policies
CREATE POLICY "issue_votes_public_read" ON public.issue_votes
  FOR SELECT USING (true);

CREATE POLICY "issue_votes_insert_own" ON public.issue_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "issue_votes_update_own" ON public.issue_votes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "issue_votes_delete_own" ON public.issue_votes
  FOR DELETE USING (auth.uid() = user_id);

-- Issue comments policies
CREATE POLICY "issue_comments_public_read" ON public.issue_comments
  FOR SELECT USING (true);

CREATE POLICY "issue_comments_insert_authenticated" ON public.issue_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "issue_comments_update_own" ON public.issue_comments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "issue_comments_delete_own_or_admin" ON public.issue_comments
  FOR DELETE USING (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM public.user_admin_roles uar
      JOIN public.admin_roles ar ON uar.role_id = ar.id
      WHERE uar.user_id = auth.uid() AND 'moderate_comments' = ANY(ar.permissions)
    )
  );

-- Issue updates policies
CREATE POLICY "issue_updates_public_read" ON public.issue_updates
  FOR SELECT USING (true);

CREATE POLICY "issue_updates_insert_admin" ON public.issue_updates
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_admin_roles uar
      JOIN public.admin_roles ar ON uar.role_id = ar.id
      WHERE uar.user_id = auth.uid() AND 'manage_issues' = ANY(ar.permissions)
    )
  );

-- Community events policies
CREATE POLICY "community_events_public_read" ON public.community_events
  FOR SELECT USING (is_public = true OR auth.uid() = organizer_id);

CREATE POLICY "community_events_insert_authenticated" ON public.community_events
  FOR INSERT WITH CHECK (auth.uid() = organizer_id);

CREATE POLICY "community_events_update_own" ON public.community_events
  FOR UPDATE USING (auth.uid() = organizer_id);

CREATE POLICY "community_events_delete_own" ON public.community_events
  FOR DELETE USING (auth.uid() = organizer_id);

-- Event attendees policies
CREATE POLICY "event_attendees_public_read" ON public.event_attendees
  FOR SELECT USING (true);

CREATE POLICY "event_attendees_insert_own" ON public.event_attendees
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "event_attendees_update_own" ON public.event_attendees
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "event_attendees_delete_own" ON public.event_attendees
  FOR DELETE USING (auth.uid() = user_id);

-- Notifications policies
CREATE POLICY "notifications_select_own" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "notifications_update_own" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "notifications_delete_own" ON public.notifications
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "notifications_system_insert" ON public.notifications
  FOR INSERT WITH CHECK (true);

-- Admin roles policies
CREATE POLICY "admin_roles_public_read" ON public.admin_roles
  FOR SELECT USING (true);

CREATE POLICY "admin_roles_super_admin_manage" ON public.admin_roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_admin_roles uar
      JOIN public.admin_roles ar ON uar.role_id = ar.id
      WHERE uar.user_id = auth.uid() AND 'super_admin' = ANY(ar.permissions)
    )
  );

-- User admin roles policies
CREATE POLICY "user_admin_roles_public_read" ON public.user_admin_roles
  FOR SELECT USING (true);

CREATE POLICY "user_admin_roles_super_admin_manage" ON public.user_admin_roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_admin_roles uar
      JOIN public.admin_roles ar ON uar.role_id = ar.id
      WHERE uar.user_id = auth.uid() AND 'super_admin' = ANY(ar.permissions)
    )
  );
