-- Row Level Security Policies for CivicConnect
-- Fixed version with proper error handling

-- Enable RLS on all tables first
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

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_public_read" ON public.profiles;

-- Profiles policies
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Allow public read access to basic profile info for community features
CREATE POLICY "profiles_public_read" ON public.profiles
  FOR SELECT USING (true);

-- Issue categories policies
DROP POLICY IF EXISTS "issue_categories_public_read" ON public.issue_categories;
DROP POLICY IF EXISTS "issue_categories_admin_manage" ON public.issue_categories;

CREATE POLICY "issue_categories_public_read" ON public.issue_categories
  FOR SELECT USING (true);

-- Civic issues policies
DROP POLICY IF EXISTS "civic_issues_public_read" ON public.civic_issues;
DROP POLICY IF EXISTS "civic_issues_insert_authenticated" ON public.civic_issues;
DROP POLICY IF EXISTS "civic_issues_update_own" ON public.civic_issues;

CREATE POLICY "civic_issues_public_read" ON public.civic_issues
  FOR SELECT USING (true);

CREATE POLICY "civic_issues_insert_authenticated" ON public.civic_issues
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "civic_issues_update_own" ON public.civic_issues
  FOR UPDATE USING (auth.uid() = reporter_id);

-- Issue votes policies
DROP POLICY IF EXISTS "issue_votes_public_read" ON public.issue_votes;
DROP POLICY IF EXISTS "issue_votes_insert_own" ON public.issue_votes;
DROP POLICY IF EXISTS "issue_votes_update_own" ON public.issue_votes;
DROP POLICY IF EXISTS "issue_votes_delete_own" ON public.issue_votes;

CREATE POLICY "issue_votes_public_read" ON public.issue_votes
  FOR SELECT USING (true);

CREATE POLICY "issue_votes_insert_own" ON public.issue_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "issue_votes_update_own" ON public.issue_votes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "issue_votes_delete_own" ON public.issue_votes
  FOR DELETE USING (auth.uid() = user_id);

-- Issue comments policies
DROP POLICY IF EXISTS "issue_comments_public_read" ON public.issue_comments;
DROP POLICY IF EXISTS "issue_comments_insert_authenticated" ON public.issue_comments;
DROP POLICY IF EXISTS "issue_comments_update_own" ON public.issue_comments;

CREATE POLICY "issue_comments_public_read" ON public.issue_comments
  FOR SELECT USING (true);

CREATE POLICY "issue_comments_insert_authenticated" ON public.issue_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "issue_comments_update_own" ON public.issue_comments
  FOR UPDATE USING (auth.uid() = user_id);

-- Community events policies
DROP POLICY IF EXISTS "community_events_public_read" ON public.community_events;
DROP POLICY IF EXISTS "community_events_insert_authenticated" ON public.community_events;
DROP POLICY IF EXISTS "community_events_update_own" ON public.community_events;

CREATE POLICY "community_events_public_read" ON public.community_events
  FOR SELECT USING (is_public = true OR auth.uid() = organizer_id);

CREATE POLICY "community_events_insert_authenticated" ON public.community_events
  FOR INSERT WITH CHECK (auth.uid() = organizer_id);

CREATE POLICY "community_events_update_own" ON public.community_events
  FOR UPDATE USING (auth.uid() = organizer_id);

-- Event attendees policies
DROP POLICY IF EXISTS "event_attendees_public_read" ON public.event_attendees;
DROP POLICY IF EXISTS "event_attendees_insert_own" ON public.event_attendees;
DROP POLICY IF EXISTS "event_attendees_update_own" ON public.event_attendees;
DROP POLICY IF EXISTS "event_attendees_delete_own" ON public.event_attendees;

CREATE POLICY "event_attendees_public_read" ON public.event_attendees
  FOR SELECT USING (true);

CREATE POLICY "event_attendees_insert_own" ON public.event_attendees
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "event_attendees_update_own" ON public.event_attendees
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "event_attendees_delete_own" ON public.event_attendees
  FOR DELETE USING (auth.uid() = user_id);

-- Notifications policies
DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_system_insert" ON public.notifications;

CREATE POLICY "notifications_select_own" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "notifications_update_own" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "notifications_system_insert" ON public.notifications
  FOR INSERT WITH CHECK (true);

-- Admin roles policies (simplified for now)
DROP POLICY IF EXISTS "admin_roles_public_read" ON public.admin_roles;
CREATE POLICY "admin_roles_public_read" ON public.admin_roles
  FOR SELECT USING (true);

-- User admin roles policies (simplified for now)
DROP POLICY IF EXISTS "user_admin_roles_public_read" ON public.user_admin_roles;
CREATE POLICY "user_admin_roles_public_read" ON public.user_admin_roles
  FOR SELECT USING (true);
