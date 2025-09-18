-- Seed initial data for CivicConnect

-- Insert default issue categories
INSERT INTO public.issue_categories (name, description, icon, color) VALUES
  ('Infrastructure', 'Roads, bridges, utilities, and public facilities', 'construction', '#3B82F6'),
  ('Safety', 'Public safety, crime, and emergency services', 'shield', '#EF4444'),
  ('Environment', 'Parks, pollution, waste management, and green spaces', 'leaf', '#10B981'),
  ('Transportation', 'Public transit, traffic, parking, and accessibility', 'car', '#F59E0B'),
  ('Community Services', 'Libraries, schools, healthcare, and social services', 'users', '#8B5CF6'),
  ('Housing', 'Affordable housing, zoning, and neighborhood development', 'home', '#EC4899'),
  ('Economic Development', 'Business support, job creation, and local economy', 'trending-up', '#06B6D4'),
  -- Fixed quote escaping using double single quotes instead of backslash
  ('Other', 'Issues that don''t fit into other categories', 'help-circle', '#6B7280')
ON CONFLICT (name) DO NOTHING;

-- Insert default admin roles
INSERT INTO public.admin_roles (name, description, permissions) VALUES
  ('Super Admin', 'Full system access and control', ARRAY['super_admin', 'manage_users', 'manage_issues', 'manage_categories', 'moderate_comments', 'manage_events', 'view_analytics']),
  ('Moderator', 'Content moderation and issue management', ARRAY['manage_issues', 'moderate_comments', 'view_analytics']),
  ('Community Manager', 'Event and community feature management', ARRAY['manage_events', 'moderate_comments', 'view_analytics']),
  ('Support Staff', 'Basic issue and user support', ARRAY['manage_issues', 'view_analytics'])
ON CONFLICT (name) DO NOTHING;
