-- Fix: Restrict checklist_update so clients cannot mark approval/payment items as complete.
-- Previously, any project participant could update any checklist item type.

DROP POLICY "checklist_update" ON public.checklist_items;

-- Designers can update any checklist item on their projects
CREATE POLICY "checklist_update_designer" ON public.checklist_items FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND designer_id = auth.uid())
  );

-- Clients can only update client-actionable item types (not approval or payment)
CREATE POLICY "checklist_update_client" ON public.checklist_items FOR UPDATE
  USING (
    public.can_access_project(project_id)
    AND type NOT IN ('approval', 'payment')
  );
