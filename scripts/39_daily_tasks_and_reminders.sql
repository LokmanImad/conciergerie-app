-- Shared daily task manager with automatic reservation reminders.
-- Prerequisite: run migration 31 and 32 first.

BEGIN;

CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL CHECK (CHAR_LENGTH(BTRIM(title)) BETWEEN 1 AND 160),
  description TEXT,
  apartment_id UUID REFERENCES public.apartments(id) ON DELETE SET NULL,
  reservation_id UUID REFERENCES public.reservations(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL DEFAULT 'manual'
    CHECK (task_type IN ('manual', 'check_in', 'check_out', 'cleaning', 'administrative', 'maintenance', 'payment', 'other')),
  status TEXT NOT NULL DEFAULT 'todo'
    CHECK (status IN ('todo', 'in_progress', 'completed', 'cancelled')),
  priority TEXT NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  assignee TEXT NOT NULL DEFAULT 'both'
    CHECK (assignee IN ('imad', 'jassem', 'both')),
  scheduled_at TIMESTAMPTZ NOT NULL,
  reminder_at TIMESTAMPTZ,
  reminder_minutes_before INTEGER
    CHECK (reminder_minutes_before IS NULL OR reminder_minutes_before BETWEEN 0 AND 43200),
  recurrence TEXT NOT NULL DEFAULT 'none'
    CHECK (recurrence IN ('none', 'daily', 'weekly', 'monthly')),
  source TEXT NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual', 'reservation')),
  completed_at TIMESTAMPTZ,
  completed_by TEXT,
  created_by TEXT,
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (reminder_at IS NULL OR reminder_at <= scheduled_at)
);

CREATE UNIQUE INDEX IF NOT EXISTS tasks_reservation_automatic_unique
  ON public.tasks(reservation_id, task_type)
  WHERE source = 'reservation' AND task_type IN ('check_in', 'check_out');
CREATE INDEX IF NOT EXISTS tasks_schedule_index ON public.tasks(scheduled_at, status);
CREATE INDEX IF NOT EXISTS tasks_reminder_index ON public.tasks(reminder_at)
  WHERE status IN ('todo', 'in_progress');
CREATE INDEX IF NOT EXISTS tasks_apartment_index ON public.tasks(apartment_id);

CREATE OR REPLACE FUNCTION public.prepare_task_write()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id TEXT := auth.jwt() ->> 'sub';
  v_apartment_id UUID;
BEGIN
  IF NEW.reservation_id IS NOT NULL THEN
    SELECT apartment_id INTO v_apartment_id
    FROM public.reservations
    WHERE id = NEW.reservation_id;
    IF v_apartment_id IS NULL THEN
      RAISE EXCEPTION 'TASK_RESERVATION_NOT_FOUND' USING ERRCODE = 'P0002';
    END IF;
    NEW.apartment_id := v_apartment_id;
  END IF;

  IF NEW.reminder_minutes_before IS NOT NULL THEN
    NEW.reminder_at := NEW.scheduled_at
      - MAKE_INTERVAL(mins => NEW.reminder_minutes_before);
  END IF;

  IF NEW.status = 'completed' AND (TG_OP = 'INSERT' OR OLD.status <> 'completed') THEN
    NEW.completed_at := COALESCE(NEW.completed_at, NOW());
    NEW.completed_by := COALESCE(NEW.completed_by, v_user_id);
  ELSIF NEW.status <> 'completed' THEN
    NEW.completed_at := NULL;
    NEW.completed_by := NULL;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.created_by := COALESCE(NEW.created_by, v_user_id);
  END IF;
  NEW.updated_by := v_user_id;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.prepare_task_write() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS prepare_task_write_trigger ON public.tasks;
CREATE TRIGGER prepare_task_write_trigger
BEFORE INSERT OR UPDATE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.prepare_task_write();

CREATE OR REPLACE FUNCTION public.sync_reservation_tasks()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_check_in_at TIMESTAMPTZ;
  v_check_out_at TIMESTAMPTZ;
BEGIN
  IF NEW.booking_status = 'cancelled' THEN
    UPDATE public.tasks
    SET status = 'cancelled', updated_at = NOW()
    WHERE reservation_id = NEW.id
      AND source = 'reservation'
      AND status <> 'completed';
    RETURN NEW;
  END IF;

  v_check_in_at := (NEW.check_in + NEW.check_in_time) AT TIME ZONE 'Africa/Casablanca';
  v_check_out_at := (NEW.check_out + NEW.check_out_time) AT TIME ZONE 'Africa/Casablanca';

  INSERT INTO public.tasks (
    title, description, apartment_id, reservation_id, task_type, status,
    priority, assignee, scheduled_at, reminder_at, reminder_minutes_before,
    recurrence, source, created_by
  ) VALUES (
    'Préparer le check-in · ' || NEW.reference,
    'Arrivée de ' || NEW.client_name || '. Vérifier le logement, les clés et les informations d’accueil.',
    NEW.apartment_id, NEW.id, 'check_in', 'todo', 'high', 'both',
    v_check_in_at, v_check_in_at - INTERVAL '1 day', 1440,
    'none', 'reservation', NEW.created_by
  )
  ON CONFLICT (reservation_id, task_type)
    WHERE source = 'reservation' AND task_type IN ('check_in', 'check_out')
  DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    apartment_id = EXCLUDED.apartment_id,
    scheduled_at = EXCLUDED.scheduled_at,
    reminder_at = EXCLUDED.reminder_at,
    reminder_minutes_before = 1440,
    status = CASE WHEN public.tasks.status = 'completed' THEN 'completed' ELSE 'todo' END,
    updated_at = NOW();

  INSERT INTO public.tasks (
    title, description, apartment_id, reservation_id, task_type, status,
    priority, assignee, scheduled_at, reminder_at, reminder_minutes_before,
    recurrence, source, created_by
  ) VALUES (
    'Préparer le check-out · ' || NEW.reference,
    'Départ de ' || NEW.client_name || '. Préparer la récupération des clés et le contrôle du logement.',
    NEW.apartment_id, NEW.id, 'check_out', 'todo', 'high', 'both',
    v_check_out_at, v_check_out_at - INTERVAL '1 day', 1440,
    'none', 'reservation', NEW.created_by
  )
  ON CONFLICT (reservation_id, task_type)
    WHERE source = 'reservation' AND task_type IN ('check_in', 'check_out')
  DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    apartment_id = EXCLUDED.apartment_id,
    scheduled_at = EXCLUDED.scheduled_at,
    reminder_at = EXCLUDED.reminder_at,
    reminder_minutes_before = 1440,
    status = CASE WHEN public.tasks.status = 'completed' THEN 'completed' ELSE 'todo' END,
    updated_at = NOW();

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_reservation_tasks() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS sync_reservation_tasks_trigger ON public.reservations;
CREATE TRIGGER sync_reservation_tasks_trigger
AFTER INSERT OR UPDATE OF check_in, check_out, check_in_time, check_out_time,
  client_name, reference, apartment_id, booking_status
ON public.reservations
FOR EACH ROW EXECUTE FUNCTION public.sync_reservation_tasks();

-- Create the two operational tasks for existing active reservations.
UPDATE public.reservations
SET check_in = check_in
WHERE booking_status <> 'cancelled';

CREATE OR REPLACE FUNCTION public.create_next_recurring_task()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_next_at TIMESTAMPTZ;
BEGIN
  IF NEW.status = 'completed'
    AND OLD.status IS DISTINCT FROM 'completed'
    AND NEW.source = 'manual'
    AND NEW.recurrence <> 'none'
  THEN
    v_next_at := CASE NEW.recurrence
      WHEN 'daily' THEN NEW.scheduled_at + INTERVAL '1 day'
      WHEN 'weekly' THEN NEW.scheduled_at + INTERVAL '1 week'
      WHEN 'monthly' THEN NEW.scheduled_at + INTERVAL '1 month'
    END;

    INSERT INTO public.tasks (
      title, description, apartment_id, reservation_id, task_type, status,
      priority, assignee, scheduled_at, reminder_minutes_before,
      recurrence, source, created_by
    ) VALUES (
      NEW.title, NEW.description, NEW.apartment_id, NEW.reservation_id,
      NEW.task_type, 'todo', NEW.priority, NEW.assignee, v_next_at,
      NEW.reminder_minutes_before, NEW.recurrence, 'manual', NEW.created_by
    );
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.create_next_recurring_task() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS create_next_recurring_task_trigger ON public.tasks;
CREATE TRIGGER create_next_recurring_task_trigger
AFTER UPDATE OF status ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.create_next_recurring_task();

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tasks_admin_access ON public.tasks;
CREATE POLICY tasks_admin_access ON public.tasks FOR ALL TO authenticated
  USING ((SELECT public.is_app_admin()))
  WITH CHECK ((SELECT public.is_app_admin()));

REVOKE ALL PRIVILEGES ON TABLE public.tasks FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.tasks TO authenticated;

COMMIT;
