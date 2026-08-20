-- Clients had zero in-app visibility of the topics staff send them:
-- lib/topics.functions.ts:sendTopicToClient() only ever queues an outbound
-- email/WhatsApp job in outbox_queue (delivered externally, never stored for
-- the client to read again) and the client portal nav has exactly three
-- items (status/documents/consents) -- no inbox. If a message never arrives
-- (bounced e-mail, wrong number) or the client just wants to re-read it
-- later, there is nowhere in the product for it to live. This adds a
-- client-visible copy, snapshotted at send time so a later edit/delete of
-- the topic template never changes what the client already received.
CREATE TABLE public.client_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  sent_by UUID REFERENCES auth.users(id),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ
);

CREATE INDEX idx_client_messages_client_id ON public.client_messages(client_id, sent_at DESC);

ALTER TABLE public.client_messages ENABLE ROW LEVEL SECURITY;

-- Same shape as the other client-owned tables (doc_all, cpd_all, ...): the
-- client reads their own rows, admin reads/writes everything. Clients get no
-- direct UPDATE/DELETE policy -- the only mutation they are allowed
-- (marking a message read) goes through mark_client_message_read() below so
-- a client can never edit the subject/body of a message they already
-- received or forge one for another client_id.
CREATE POLICY "client_messages_select" ON public.client_messages FOR SELECT TO authenticated
  USING (client_id = auth.uid() OR private.has_role(auth.uid(),'admin'::public.app_role));

CREATE POLICY "client_messages_admin_insert" ON public.client_messages FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(),'admin'::public.app_role));

CREATE POLICY "client_messages_admin_update" ON public.client_messages FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(),'admin'::public.app_role));

CREATE POLICY "client_messages_admin_delete" ON public.client_messages FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(),'admin'::public.app_role));

CREATE OR REPLACE FUNCTION public.mark_client_message_read(p_message_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.client_messages
  SET read_at = now()
  WHERE id = p_message_id AND client_id = auth.uid() AND read_at IS NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_client_message_read(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_client_message_read(UUID) TO authenticated;
