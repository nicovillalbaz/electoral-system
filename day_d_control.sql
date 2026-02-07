-- DAY D CONTROL MIGRATION
-- 1. Ensure tasks table exists and has necessary columns
CREATE TABLE IF NOT EXISTS tasks (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    priority text DEFAULT 'MEDIUM', -- 'LOW', 'MEDIUM', 'HIGH', 'URGENT'
    task_type text DEFAULT 'VISIT', -- 'VISIT', 'CALL', 'EVENT', 'LOGISTICS', 'FINANCIAL'
    due_date timestamp with time zone,
    assigned_user_id uuid,
    created_by uuid,
    related_person_id uuid,
    related_list_id uuid,
    location_text text,
    location_lat numeric,
    location_lng numeric,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 2. Ensure task_expenses table exists for the closing flow of Financial tasks
CREATE TABLE IF NOT EXISTS task_expenses (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    amount numeric NOT NULL,
    concept text NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now()
);

-- 3. Ensure persons has has_voted (it should, but just in case)
ALTER TABLE persons ADD COLUMN IF NOT EXISTS has_voted boolean DEFAULT false;

-- 4. Useful indexes
CREATE INDEX IF NOT EXISTS idx_tasks_campaign ON tasks(campaign_id);
CREATE INDEX IF NOT EXISTS idx_tasks_type ON tasks(task_type);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(completed_at) WHERE completed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_task_expenses_task ON task_expenses(task_id);
