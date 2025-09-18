-- Functions and triggers for CivicConnect

-- Function to automatically create a profile when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'first_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'last_name', '')
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function to update vote counts on civic issues
CREATE OR REPLACE FUNCTION public.update_issue_vote_counts()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.vote_type = 'up' THEN
      UPDATE public.civic_issues 
      SET upvotes = upvotes + 1 
      WHERE id = NEW.issue_id;
    ELSIF NEW.vote_type = 'down' THEN
      UPDATE public.civic_issues 
      SET downvotes = downvotes + 1 
      WHERE id = NEW.issue_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.vote_type = 'up' THEN
      UPDATE public.civic_issues 
      SET upvotes = upvotes - 1 
      WHERE id = OLD.issue_id;
    ELSIF OLD.vote_type = 'down' THEN
      UPDATE public.civic_issues 
      SET downvotes = downvotes - 1 
      WHERE id = OLD.issue_id;
    END IF;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle vote type changes
    IF OLD.vote_type = 'up' AND NEW.vote_type = 'down' THEN
      UPDATE public.civic_issues 
      SET upvotes = upvotes - 1, downvotes = downvotes + 1 
      WHERE id = NEW.issue_id;
    ELSIF OLD.vote_type = 'down' AND NEW.vote_type = 'up' THEN
      UPDATE public.civic_issues 
      SET upvotes = upvotes + 1, downvotes = downvotes - 1 
      WHERE id = NEW.issue_id;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

-- Trigger for vote count updates
DROP TRIGGER IF EXISTS issue_vote_counts_trigger ON public.issue_votes;
CREATE TRIGGER issue_vote_counts_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.issue_votes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_issue_vote_counts();

-- Function to update event attendee counts
CREATE OR REPLACE FUNCTION public.update_event_attendee_counts()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'attending' THEN
      UPDATE public.community_events 
      SET current_attendees = current_attendees + 1 
      WHERE id = NEW.event_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.status = 'attending' THEN
      UPDATE public.community_events 
      SET current_attendees = current_attendees - 1 
      WHERE id = OLD.event_id;
    END IF;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status != 'attending' AND NEW.status = 'attending' THEN
      UPDATE public.community_events 
      SET current_attendees = current_attendees + 1 
      WHERE id = NEW.event_id;
    ELSIF OLD.status = 'attending' AND NEW.status != 'attending' THEN
      UPDATE public.community_events 
      SET current_attendees = current_attendees - 1 
      WHERE id = NEW.event_id;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

-- Trigger for event attendee count updates
DROP TRIGGER IF EXISTS event_attendee_counts_trigger ON public.event_attendees;
CREATE TRIGGER event_attendee_counts_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.event_attendees
  FOR EACH ROW
  EXECUTE FUNCTION public.update_event_attendee_counts();

-- Function to create notifications for issue updates
CREATE OR REPLACE FUNCTION public.create_issue_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Notify issue reporter of status changes (except their own updates)
  IF NEW.update_type = 'status_change' AND NEW.updated_by != (
    SELECT reporter_id FROM public.civic_issues WHERE id = NEW.issue_id
  ) THEN
    INSERT INTO public.notifications (user_id, title, message, type, related_id)
    SELECT 
      ci.reporter_id,
      'Issue Status Updated',
      'Your issue "' || ci.title || '" status changed from ' || NEW.old_value || ' to ' || NEW.new_value,
      'issue_update',
      NEW.issue_id
    FROM public.civic_issues ci
    WHERE ci.id = NEW.issue_id AND ci.reporter_id IS NOT NULL;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger for issue update notifications
DROP TRIGGER IF EXISTS issue_notification_trigger ON public.issue_updates;
CREATE TRIGGER issue_notification_trigger
  AFTER INSERT ON public.issue_updates
  FOR EACH ROW
  EXECUTE FUNCTION public.create_issue_notification();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Add update timestamp triggers to relevant tables
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_civic_issues_updated_at ON public.civic_issues;
CREATE TRIGGER update_civic_issues_updated_at
  BEFORE UPDATE ON public.civic_issues
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_issue_comments_updated_at ON public.issue_comments;
CREATE TRIGGER update_issue_comments_updated_at
  BEFORE UPDATE ON public.issue_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_community_events_updated_at ON public.community_events;
CREATE TRIGGER update_community_events_updated_at
  BEFORE UPDATE ON public.community_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
