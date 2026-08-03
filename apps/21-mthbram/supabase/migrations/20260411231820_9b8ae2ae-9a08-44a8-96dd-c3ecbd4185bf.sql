
-- Add email field to portal_messages
ALTER TABLE public.portal_messages ADD COLUMN IF NOT EXISTS sender_email text DEFAULT '';

-- Allow deletion of portal messages
CREATE POLICY "Anyone can delete portal_messages"
ON public.portal_messages
FOR DELETE
USING (true);
