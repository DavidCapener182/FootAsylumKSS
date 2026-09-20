-- Preserve completed reports while creating retry-safe revisions in one transaction.
create function public.fa_audit_studio_revise(p_parent uuid,p_id uuid,p_user uuid)
returns uuid language plpgsql security invoker set search_path='' as $$
declare a public.fa_audit_studio_audits; existing public.fa_audit_studio_audits; d jsonb; refs jsonb='[]'::jsonb; item jsonb; new_id uuid;
begin
 select * into a from public.fa_audit_studio_audits where id=p_parent for update;
 if a.id is null or a.status<>'completed' then raise exception 'Only completed audits can be revised'; end if;
 select * into existing from public.fa_audit_studio_audits where id=p_id;
 if existing.id is not null then
  if existing.parent_id<>p_parent or existing.created_by<>p_user then raise exception 'Audit identifier conflict'; end if;
  return p_id;
 end if;
 d=jsonb_set(a.document,'{signOff}','{"auditorSignature":"","representative":"","representativeSignature":"","unavailableReason":""}'::jsonb);
 insert into public.fa_audit_studio_audits(id,store_id,template_version,created_by,parent_id,document,result)
 values(p_id,a.store_id,a.template_version,p_user,p_parent,d,a.result);
 for item in select value from jsonb_array_elements(a.document->'evidence') loop
  new_id=gen_random_uuid();
  insert into public.fa_audit_studio_evidence(id,audit_id,question_id,file_name,file_type,file_size,status,source_path,render_path,sha256)
   select new_id,p_id,question_id,file_name,file_type,file_size,status,source_path,render_path,sha256 from public.fa_audit_studio_evidence where audit_id=p_parent and id=(item->>'id')::uuid and status='ready';
  if not found then raise exception 'Original evidence is missing'; end if;
  refs=refs||jsonb_build_array(jsonb_set(item,'{id}',to_jsonb(new_id::text)));
 end loop;
 update public.fa_audit_studio_audits set document=jsonb_set(d,'{evidence}',refs) where id=p_id;
 insert into public.fa_audit_studio_responses select p_id,question_id,response from public.fa_audit_studio_responses where audit_id=p_parent;
 insert into public.fa_audit_studio_findings select p_id,question_id,note,action from public.fa_audit_studio_findings where audit_id=p_parent;
 return p_id;
end $$;
revoke all on function public.fa_audit_studio_revise(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.fa_audit_studio_revise(uuid,uuid,uuid) to service_role;
