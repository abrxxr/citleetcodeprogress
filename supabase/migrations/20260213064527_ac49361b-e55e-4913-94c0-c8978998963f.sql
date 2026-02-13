
-- Create a table to store teacher/admin accounts (separate from students)
CREATE TABLE public.admin_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE,
  display_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view admin accounts"
ON public.admin_accounts
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Insert the admin account entry
INSERT INTO public.admin_accounts (username, display_name)
VALUES ('admin', 'Admin');
