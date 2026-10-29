import { api,post,put,role,state,esc,button,field,select,check,table,modal,photoField,upload,photos,render,notify,download } from './app.js';

export async function repairPage(){
 const [rows,catalog]=await Promise.all([api('/repair-orders'),api('/repair-catalog')]);state.data.repairs=rows;state.data.catalog=catalog;
 return `<section class="panel"><div class="toolbar"><h3>${role()==='STUDENT'?'我的报修':role()==='REPAIRER'?'维修任务与历史':'报修工单'}</h3><div class="actions">${role()==='STUDENT'?button('新建报修','repair-create'):''}${button('导出记录','repair-export')}</div></div><label class="field search"><span>搜索工单、人员、状态</span><input id="list-search" type="search"></label>${table(rows,[['order_no','工单号'],['title','标题'],['student_name','学生'],['building_name','楼栋'],['room_no','房间'],['category_name','分类'],['current_status','状态'],['repairer_name','维修人员'],['score','评分']],actions,'order_id')}</section>`;
}
function actions(r){
 let result=button('详情','repair-detail',r.order_id);
 const add=(label,key)=>result+=button(label,`repair-${key}`,r.order_id);
 if(role()==='STUDENT'){
  if(['DRAFT','PENDING_EDIT'].includes(r.current_status)){add('编辑','edit');add('提交审核','submit');}
  if(['DRAFT','PENDING_EDIT','PENDING_REVIEW','PENDING_ASSIGN','PENDING_MANUAL'].includes(r.current_status)&&!r.dispatch_id)add('撤销','cancel');
  if(r.current_status==='REPAIRED'){add('确认完成','confirm');add('申请重修','rework');}
  if(r.current_status==='CONFIRMED')add('评价','evaluate');
 }
 if(role()==='DORM_MANAGER'){
  if(r.current_status==='PENDING_REVIEW')add('审核','review');
  if(['PENDING_MANUAL','PENDING_ASSIGN'].includes(r.current_status)){add('强制派单','dispatch');add('退回修改','return');}
  if(r.current_status==='DELAYED')add('延期审核','delay-review');
 }
 if(['ADMIN','DORM_MANAGER'].includes(role())&&r.current_status==='PENDING_MANUAL'&&!r.urgent&&!r.abnormal&&!r.parent_order_id)add('重新自动派单','retry');
 if(role()==='REPAIRER'&&String(r.repairer_user_id)===String(state.user.id)){
  if(r.current_status==='PENDING_ACCEPT')add('接单或拒单','decision');
  if(['ACCEPTED','DELAYED'].includes(r.current_status)){add('提交维修结果','result');add('申请延期','delay');}
 }
 return result;
}
function repairForm(row={}){return field('title','报修标题','text',row.title||'')+select('categoryId','故障分类',state.data.catalog.categories.map(c=>[c.id,c.name]),row.category_id)+field('description','故障位置与说明','textarea',row.description||'')+photoField();}
export async function repairAction(action,id){
 const row=state.data.repairs.find(r=>String(r.order_id)===id);
 if(action==='repair-export'){download('repair-orders.json',await Promise.all(state.data.repairs.map(r=>api(`/repair-orders/${r.order_id}`))));return;}
 if(action==='repair-create'){
  const homes=await api('/accommodations/current');if(!homes.length)throw new Error('尚未分配宿舍，请联系管理员');
  modal('新建报修',`<p>${esc(homes[0].building_name)} ${esc(homes[0].room_no)} / ${esc(homes[0].bed_no)}</p>`+repairForm()+check('submitNow','保存后提交审核',true),async(d,f)=>{const created=await post('/repair-orders',{...d,fileIds:await upload(f)});if(d.submitNow)await post(`/repair-orders/${created.orderId}/submit`);});return;
 }
 if(action==='repair-edit'){modal('编辑报修',repairForm(row),async(d,f)=>put(`/repair-orders/${id}`,{...d,fileIds:await upload(f)}));return;}
 if(['repair-submit','repair-retry'].includes(action)){await post(`/repair-orders/${id}/${action.slice(7)}`);await render();notify('操作成功');return;}
 if(['repair-confirm','repair-cancel'].includes(action)){modal(action==='repair-confirm'?'确认维修完成':'撤销报修',`<p>${esc(row.title)}</p>`,()=>post(`/repair-orders/${id}/${action.slice(7)}`),'确认');return;}
 if(action==='repair-review'||action==='repair-return'){modal('报修审核',select('pass','审核结论',action==='repair-return'?[['false','退回修改']]:[['true','通过'],['false','退回修改']])+check('urgent','紧急工单',!!row.urgent)+field('reason','审核意见','textarea','',false),d=>post(`/repair-orders/${id}/review`,{...d,pass:d.pass==='true',urgent:!!d.urgent}));return;}
 if(action==='repair-dispatch'){const candidates=await api(`/repair-orders/${id}/candidates`);if(!candidates.length)throw new Error('无符合工种和楼栋资质的维修人员，请管理员调整人员资质与负责范围');modal('手动强制派单',select('repairerUserId','维修人员',candidates.map(w=>[w.repairer_user_id,`${w.real_name} · 在办 ${w.active_orders} 单`])),d=>post(`/repair-orders/${id}/dispatch`,d),'确认强制派单');return;}
 if(action==='repair-decision'){modal('处理自动派单',select('accept','处理决定',[['true','接单'],['false','拒单']])+field('reason','拒单原因','textarea','',false),d=>post(`/repair-orders/${id}/decision`,{...d,accept:d.accept==='true'}));return;}
 if(action==='repair-result'){modal('提交维修结果',field('result','维修结果','textarea')+photoField(true),async(d,f)=>post(`/repair-orders/${id}/result`,{...d,fileIds:await upload(f)}),'提交结果');return;}
 if(action==='repair-delay'){modal('申请延期',`<p>当前维修期限：${esc(row.repair_deadline)}</p>`+field('reason','延期原因','textarea')+field('expectedFinishAt','预计修好时间','datetime-local')+photoField(true),async(d,f)=>post(`/repair-orders/${id}/delay`,{...d,fileIds:await upload(f)}),'提交延期申请');return;}
 if(action==='repair-delay-review'){const detail=await api(`/repair-orders/${id}`);const delay=detail.delays.find(x=>x.current_status==='PENDING');if(!delay)throw new Error('没有待审核延期申请');const dialog=modal('延期审核',`<p>${esc(delay.reason)}</p><p>预计完成：${esc(delay.expected_finish_at)}</p><div class="photo-list"></div>`+select('pass','审核结论',[['true','通过'],['false','不通过']])+field('reason','审核意见','textarea','',false),d=>post(`/repair-orders/${id}/delay-review`,{...d,pass:d.pass==='true'}));await photos(dialog,detail.files.filter(x=>x.purpose==='DELAY'));return;}
 if(action==='repair-evaluate'){modal('维修评价',select('score','评分',[[5,'5 分'],[4,'4 分'],[3,'3 分'],[2,'2 分'],[1,'1 分']])+field('comment','评价内容','textarea','',false),d=>post(`/repair-orders/${id}/evaluation`,d));return;}
 if(action==='repair-rework'){modal('申请重修',field('reason','未解决的问题','textarea')+photoField(),async(d,f)=>post(`/repair-orders/${id}/rework`,{...d,fileIds:await upload(f)}),'提交重修审核');return;}
 if(action==='repair-detail'){const d=await api(`/repair-orders/${id}`);const dialog=modal('工单详情',`<h3>${esc(d.title)}</h3><p>${esc(d.description)}</p><p>审核意见：${esc(d.reject_reason||'-')}</p><p>维修结果：${esc(d.result_text||'-')}</p><p>评价：${esc(d.score||'-')} / ${esc(d.comment||'-')}</p><p>拒单 ${d.reject_count} 次；接单超时 ${d.accept_timeout_count} 次；维修超时 ${d.repair_timeout_count} 次</p><div class="photo-list"></div><h3>审核记录</h3>${table(d.audits,[['result','结论'],['reason','原因'],['created_at','时间']])}<h3>派单记录</h3>${table(d.dispatches,[['repairer_name','维修人员'],['dispatch_mode','派单方式'],['dispatch_status','结果'],['decision_reason','原因'],['created_at','时间']])}<h3>延期记录</h3>${table(d.delays,[['reason','原因'],['expected_finish_at','预计时间'],['current_status','状态'],['review_reason','审核意见']])}`,null);await photos(dialog,d.files);}
}
