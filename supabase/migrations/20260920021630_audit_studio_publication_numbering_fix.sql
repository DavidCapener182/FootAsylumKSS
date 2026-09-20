-- Atomic publication needs access to private report/history tables. This narrow
-- definer operation requires the real auth.uid() to match an active Admin. It
-- never changes JWT claims or actor attribution; activity triggers retain auth.uid().
create or replace function public.fa_publish_studio_audit(p_audit uuid,p_store uuid,p_user uuid,p_path text,p_hash text)
returns public.fa_audit_studio_publications language plpgsql security definer set search_path='' as $$
declare a public.fa_audit_studio_audits; s public.fa_stores; existing public.fa_audit_studio_publications;
 yr integer; n integer; latest date; visit date; parent_number integer; vals jsonb; k integer; d date;
begin
 if auth.uid() is null or auth.uid()<>p_user then raise exception 'Authenticated auditor required'; end if;
 if not exists(select 1 from public.fa_profiles where id=p_user and role='admin' and account_status='active') then raise exception 'Active Admin required'; end if;
 select * into s from public.fa_stores where id=p_store for update;
 if not found or not s.is_active then raise exception 'Active store required'; end if;
 select * into existing from public.fa_audit_studio_publications where audit_id=p_audit;
 if found then
  if existing.store_id<>p_store then raise exception 'Store mismatch'; end if;
  return existing;
 end if;
 select * into a from public.fa_audit_studio_audits where id=p_audit;
 if not found or a.status<>'completed' or a.store_id<>p_store or coalesce(a.document->>'purpose','practice')<>'store'
    or a.pdf_path is null or a.pdf_sha256 is distinct from p_hash then raise exception 'Completed store audit required'; end if;
 if p_path<>('store/'||p_store||'/audit-studio-'||p_audit||'.pdf') then raise exception 'Invalid report path'; end if;
 visit := (a.document#>>'{site,visitDate}')::date; yr:=extract(year from visit);
 latest:=greatest(s.compliance_audit_1_date,s.compliance_audit_2_date,s.compliance_audit_3_date);
 if latest is not null and visit<latest then raise exception 'A newer store audit already exists'; end if;
 vals:=to_jsonb(s);
 -- Capture current slots again so reports changed since migration remain in history.
 for k in 1..3 loop
  d:=(vals->>('compliance_audit_'||k||'_date'))::date;
  if d is not null then
   insert into public.fa_store_audit_history(store_id,kind,audit_year,audit_number,visit_date,percentage,pdf_path)
   values(p_store,'H&S',extract(year from d),k,d,(vals->>('compliance_audit_'||k||'_overall_pct'))::numeric,vals->>('compliance_audit_'||k||'_pdf_path')) on conflict do nothing;
  end if;
 end loop;
 if s.fire_risk_assessment_date is not null then
  insert into public.fa_store_audit_history(store_id,kind,audit_year,visit_date,percentage,pdf_path)
  values(p_store,'FRA',extract(year from s.fire_risk_assessment_date),s.fire_risk_assessment_date,s.fire_risk_assessment_pct,s.fire_risk_assessment_pdf_path) on conflict do nothing;
 end if;
 select audit_number into parent_number from public.fa_audit_studio_publications where audit_id=a.parent_id and store_id=p_store and audit_year=yr;
 if parent_number is not null then
  -- Only the most recently published revision of this slot can be superseded.
  if exists(select 1 from public.fa_audit_studio_publications where store_id=p_store and audit_year=yr and audit_number=parent_number and published_at>(select published_at from public.fa_audit_studio_publications where audit_id=a.parent_id)) then raise exception 'Revise the latest published report'; end if;
  n:=parent_number;
 else
  select coalesce(max(seq.slot),0)+1 into n from generate_series(1,3) as seq(slot) where extract(year from (vals->>('compliance_audit_'||seq.slot||'_date'))::date)=yr;
 end if;
 if n>3 then raise exception 'Three visits already recorded this year; create a linked revision for a correction'; end if;
 if latest is not null and extract(year from latest)<yr then
  update public.fa_stores set compliance_audit_1_date=null,compliance_audit_1_overall_pct=null,compliance_audit_1_pdf_path=null,
   compliance_audit_2_date=null,compliance_audit_2_overall_pct=null,compliance_audit_2_pdf_path=null,
   compliance_audit_3_date=null,compliance_audit_3_overall_pct=null,compliance_audit_3_pdf_path=null,
   action_plan_1_sent=false,action_plan_2_sent=false,action_plan_3_sent=false,
   compliance_audit_2_planned_date=null,compliance_audit_2_assigned_manager_user_id=null where id=p_store;
 end if;
 execute format('update public.fa_stores set %I=$1,%I=$2,%I=$3,%I=false,updated_at=now(),total_audits_to_date=coalesce(total_audits_to_date,0)+$4 where id=$5',
 'compliance_audit_'||n||'_date','compliance_audit_'||n||'_overall_pct','compliance_audit_'||n||'_pdf_path','action_plan_'||n||'_sent')
 using visit,(a.result->>'percentage')::numeric,p_path,case when parent_number is null then 1 else 0 end,p_store;
 insert into public.fa_audit_studio_publications(audit_id,store_id,audit_year,audit_number,pdf_path,pdf_sha256,published_by)
 values(p_audit,p_store,yr,n,p_path,p_hash,p_user) returning * into existing;
 insert into public.fa_store_audit_history(store_id,kind,audit_year,audit_number,visit_date,percentage,pdf_path)
 values(p_store,'H&S',yr,n,visit,(a.result->>'percentage')::numeric,p_path);
 insert into public.fa_store_actions(store_id,title,description,priority,status,created_by_user_id,due_date,source_audit_date,source_audit_number,source_pdf_path,source_finding_key,ai_generated)
 select p_store,f.question_id||' · '||coalesce(q.value->>'question','Audit finding'),f.note||E'\nAction: '||coalesce(f.action->>'text','')||E'\nOwner: '||coalesce(f.action->>'owner',''),
 'medium','open',p_user,nullif(f.action->>'dueDate','')::date,visit,n,p_path,'studio:'||p_audit||':'||f.question_id,false
 from public.fa_audit_studio_findings f join public.fa_audit_studio_templates t on t.version=a.template_version
 cross join lateral jsonb_array_elements(t.definition->'sections') sec cross join lateral jsonb_array_elements(sec->'checks') q
 where f.audit_id=p_audit and q.value->>'id'=f.question_id;
 return existing;
end $$;
revoke all on function public.fa_publish_studio_audit(uuid,uuid,uuid,text,text) from public,anon,authenticated;
revoke all on function public.fa_publish_studio_audit(uuid,uuid,uuid,text,text) from service_role;
grant execute on function public.fa_publish_studio_audit(uuid,uuid,uuid,text,text) to authenticated;
