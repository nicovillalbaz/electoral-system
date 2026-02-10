BEGIN;

-- 1. Add assigned_user_id to persons (Responsable del votante)
ALTER TABLE IF EXISTS persons ADD COLUMN IF NOT EXISTS assigned_user_id uuid REFERENCES users(id);

-- 2. Add manager_user_id to stations (Jefe de PC / Responsable de Puesto)
ALTER TABLE IF EXISTS stations ADD COLUMN IF NOT EXISTS manager_user_id uuid REFERENCES users(id);

-- 3. Add operational_role to users
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS operational_role text;

-- 4. Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(id),
    message text NOT NULL,
    is_read boolean DEFAULT false,
    type text NOT NULL, -- ACTIVITY_ASSIGNED, VOTER_ASSIGNED
    link text,
    created_at timestamp with time zone DEFAULT now()
);

COMMIT;
