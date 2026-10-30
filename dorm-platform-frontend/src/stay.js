import {API,api,post,put,role,state,esc,button,field,select,check,table,modal,render,notify,download,downloadCsv} from './app.js';

export async function stayPage(){
 const [batches,rows]=await Promise.all([api('/stay/current'),api('/stay/applications')]);state.data.batches=batches;state.data.stays=rows;
 rows.forEach(row=>row.dates=stayDates(row));
 const batchActions=batch=>role()==='STUDENT'?button('填写申请','stay-apply',batch.batch_id)+button('留宿通知','stay-batch-notice',batch.batch_id):role()==='ADMIN'?button('编辑开放区间','stay-batch-edit',batch.batch_id)+button('人工添加','stay-supplement',batch.batch_id):button('发布楼栋申请','stay-publish',batch.batch_id)+button('批量锁定','stay-lock-all',batch.batch_id)+button('逾期补录','stay-supplement',batch.batch_id);
 return `<section class="panel"><div class="toolbar"><h3>留宿批次</h3>${role()==='ADMIN'?button('新增开放区间','stay-batch-new'):''}</div>${table(batchRows(batches),[['batch_name','批次'],['academic_year','年份'],['vacation_label','假期'],['open_start_date','开放开始'],['open_end_date','开放结束'],[role()==='STUDENT'?'student_deadline':'application_deadline','申请截止']],batchActions,'batch_id')}</section><section class="panel"><div class="toolbar"><h3>留宿申请与历史</h3>${button('导出申请记录','stay-export')}</div><label class="field search"><span>搜索申请</span><input id="list-search" type="search"></label>${table(rows,[['student_name','学生'],['batch_name','批次'],['building_name','楼栋'],['dates','日期'],['current_status','状态'],['source','来源'],['review_reason','审核意见'],['resubmit_deadline','重交截止'],['archive_reason','归档原因']],actions,'application_id')}</section>`;
}
const uniqueValues=values=>[...new Set(values.filter(value=>value!=null&&String(value).trim()!=='').map(String))].sort((a,b)=>a.localeCompare(b,'zh-CN'));
const vacationLabel=value=>value==='SUMMER'?'暑假':'寒假';
function batchRows(batches){return batches.map(batch=>({...batch,vacation_label:vacationLabel(batch.vacation_type),batch_status_label:batch.current_status==='OPEN'?'已开放':batch.current_status==='DRAFT'?'待发布':batch.current_status}));}
function stayDates(row){return (row.dateRanges||[]).map(range=>`${range.startDate} 至 ${range.endDate}`).join('，');}
export async function staySchoolPage(){
 const [batches,applications,homes]=await Promise.all([api('/stay/current'),api('/stay/applications'),api('/accommodations/current')]);
 state.data.batches=batches;state.data.stays=applications;state.data.homes=homes;
 const selected= batches.find(batch=>String(batch.batch_id)===String(state.data.selectedStayBatchId))||batches.find(batch=>batch.current_status==='OPEN')||batches[0];
 state.data.selectedStayBatchId=selected?.batch_id||'';
 const approved=applications.filter(row=>selected&&String(row.batch_id)===String(selected.batch_id)&&row.current_status==='APPROVED').map(row=>({...row,dates:stayDates(row)}));
 const batchAction=batch=>button('编辑','stay-batch-edit',batch.batch_id);
 const approvedFilters=state.data.stayApprovedFilters||{};const visibleApproved=filterApproved(approved,approvedFilters);
 return `<section class="panel"><div class="toolbar"><h3>全校留宿批次</h3><div class="actions">${button('新增留宿批次','stay-batch-new')}${selected?.current_status==='DRAFT'?button('发布留宿通知','stay-publish',selected.batch_id):''}${button('留宿历史','stay-history-open')}</div></div>${table(batchRows(batches),[['batch_name','留宿批次'],['academic_year','年份'],['vacation_label','假期'],['open_start_date','开放开始'],['open_end_date','开放结束'],['application_deadline','申请截止'],['batch_status_label','状态']],batchAction,'batch_id')}</section><section class="panel"><div class="toolbar"><h3>${selected?`${esc(selected.batch_name)}：通过名单`:'本次留宿通过名单'}</h3><div class="actions"><span class="muted">仅展示审核通过的学生</span>${selected?button('人工补录','stay-supplement',selected.batch_id):''}${button('导出 CSV','stay-export-csv')}${button('导出 JSON','stay-export')}</div></div><form id="stay-roster-batch-form" class="filter-grid">${select('batchId','留宿批次',batches.map(batch=>[batch.batch_id,batch.batch_name]),selected?.batch_id||'',false,false)}</form><form id="stay-approved-filter-form" class="filter-grid">${field('student','学生姓名或学号','search',approvedFilters.student||'',false)}${field('building','楼栋','search',approvedFilters.building||'',false)}${field('major','专业','search',approvedFilters.major||'',false)}<div class="filter-actions"><button class="primary">查询</button><button type="reset" class="secondary" data-filter-clear="stay-approved-filter-form">清空</button></div></form>${table(visibleApproved,[['student_no','学号'],['student_name','姓名'],['building_name','楼栋'],['dates','留宿日期'],['reason','留宿原因']],null,'application_id')}</section>`;
}
function filterApproved(rows,filters){return rows.filter(row=>(!filters.student||String(row.student_name||'').includes(filters.student)||String(row.student_no||'').includes(filters.student))&&(!filters.building||String(row.building_name||'').includes(filters.building))&&(!filters.major||String(row.major_name||'').includes(filters.major)));}
function filterStayHistory(rows,filters){
 const student=String(filters.student||'').trim().toLowerCase();
 const matchesDateRange=row=>(row.dateRanges||[]).some(range=>{
  const start=String(range.startDate||'').slice(0,10),end=String(range.endDate||'').slice(0,10);
  return (!filters.stayDateFrom||end>=filters.stayDateFrom)&&(!filters.stayDateTo||start<=filters.stayDateTo);
 });
 return rows.filter(row=>(!student||String(row.student_name||'').toLowerCase().includes(student)||String(row.student_no||'').toLowerCase().includes(student))&&(!filters.academicYear||String(row.academic_year)===String(filters.academicYear))&&(!filters.vacationType||row.vacation_type===filters.vacationType)&&(!filters.buildingName||row.building_name===filters.buildingName)&&((!filters.stayDateFrom&&!filters.stayDateTo)||matchesDateRange(row)));
}
export async function stayHistoryPage(){
 const [applications,batches]=await Promise.all([api('/stay/applications'),api('/stay/current')]);
 state.data.stays=applications;state.data.batches=batches;
 const history=applications.filter(row=>row.current_status==='COMPLETED').map(row=>({...row,dates:stayDates(row),vacation_label:vacationLabel(row.vacation_type)}));
 const filters=state.data.stayHistoryFilters||{};
 const years=uniqueValues([...history.map(row=>row.academic_year),...batches.map(row=>row.academic_year)]);
 const fields=field('student','学生（姓名或学号）','search',filters.student||'',false)+select('buildingName','楼栋',[['','全部楼栋'],...uniqueValues(history.map(row=>row.building_name)).map(value=>[value,value])],filters.buildingName||'',false,false)+select('academicYear','年份',[['','全部年份'],...years.map(value=>[value,value])],filters.academicYear||'',false,false)+select('vacationType','假期',[['','全部假期'],['SUMMER','暑假'],['WINTER','寒假']],filters.vacationType||'',false,false)+`<div class="field range-field"><span>留宿日期范围</span><div class="range-control"><input type="date" name="stayDateFrom" value="${esc(filters.stayDateFrom||'')}" aria-label="留宿开始日期"><span aria-hidden="true">至</span><input type="date" name="stayDateTo" value="${esc(filters.stayDateTo||'')}" aria-label="留宿结束日期"></div></div>`;
 const rows=filterStayHistory(history,filters);
 return `<section class="panel"><div class="toolbar"><h3>留宿历史</h3><div class="actions">${button('返回全校留宿','stay-history-back')}${button('导出 CSV','stay-export-csv')}${button('导出 JSON','stay-export')}</div></div><form id="stay-history-filter-form" class="filter-grid stay-history-filter-grid">${fields}<div class="filter-actions"><button class="primary" type="submit">查询</button>${button('清空筛选','stay-history-filter-reset')}</div></form><div class="resource-result-count">共 ${rows.length} 条</div>${table(rows,[['student_no','学号'],['student_name','姓名'],['batch_name','批次'],['academic_year','年份'],['vacation_label','假期'],['building_name','楼栋'],['dates','留宿日期'],['reason','留宿原因']],null,'application_id')}</section>`;
}
function actions(r){let html=button('详情','stay-detail',r.application_id);const add=(label,key)=>html+=button(label,'stay-'+key,r.application_id);if(role()==='STUDENT'&&['DRAFT','PENDING_REVIEW','PENDING_EDIT'].includes(r.current_status)){add('修改','edit');add('提交','submit');if(r.current_status==='PENDING_REVIEW')add('撤回','withdraw');}if(role()==='DORM_MANAGER'){if(r.current_status==='PENDING_REVIEW')add('锁定','lock');if(r.current_status==='UNDER_REVIEW'){add('审核','review');if(!r.resubmit_deadline)add('取消锁定','unlock');}}if(role()==='ADMIN'&&r.source!=='NORMAL'&&r.current_status==='UNDER_REVIEW')add('审核','review');return html;}
function rangeRow(start='',end=''){return `<div class="date-range">${field('startDate','开始日期','date',start)}${field('endDate','结束日期','date',end)}<button type="button" class="icon-button" data-remove-range title="移除时间段" aria-label="移除时间段">&times;</button></div>`;}
function rangesForm(row={}){return `<div class="date-ranges">${(row.dateRanges?.length?row.dateRanges:[{startDate:'',endDate:''}]).map(r=>rangeRow(r.startDate,r.endDate)).join('')}</div><button type="button" class="secondary" id="add-range">添加时间段</button>${field('reason','留宿原因','textarea',row.reason||'')}`;}
function bindRanges(dialog){const list=dialog.querySelector('.date-ranges');dialog.querySelector('#add-range').onclick=()=>{list.insertAdjacentHTML('beforeend',rangeRow());bindRemove();};function bindRemove(){list.querySelectorAll('[data-remove-range]').forEach(b=>b.onclick=()=>{if(list.children.length>1)b.parentElement.remove();});}bindRemove();}
function getRanges(form){return [...form.querySelectorAll('.date-range')].map(r=>({startDate:r.querySelector('[name=startDate]').value,endDate:r.querySelector('[name=endDate]').value}));}
async function downloadStayMaterial(fileId,name){const response=await fetch(`${API}/files/${fileId}`,{headers:{Authorization:`Bearer ${state.token}`}});if(!response.ok)throw new Error('材料下载失败');const url=URL.createObjectURL(await response.blob()),link=document.createElement('a');link.href=url;link.download=name||'留宿申请材料';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function bindMaterialDownloads(root){root.querySelectorAll('[data-stay-material-download]').forEach(button=>button.onclick=()=>downloadStayMaterial(button.dataset.stayMaterialDownload,button.dataset.name).catch(error=>notify(error.message,true)));}
export async function stayAction(action,id,b){
 const row=state.data.stays.find(r=>String(r.application_id)===id);
 const batch=state.data.batches.find(b=>String(b.batch_id)===id);
 if(action==='stay-history-open'){state.page='stayHistory';await render();return;}
 if(action==='stay-history-back'){state.page='staySchool';await render();return;}
 if(action==='stay-select-batch'){state.data.selectedStayBatchId=id;await render();return;}
 if(action==='stay-history-filter-reset'){delete state.data.stayHistoryFilters;await render();return;}
 if(action==='stay-material-download'){await downloadStayMaterial(id,b?.dataset.name);return;}
 if(action==='stay-batch-notice'){
  const materials=batch?.materials||[],files=materials.length?table(materials,[['original_name','申请材料示例'],['size_bytes','文件大小（字节）']],file=>`<button type="button" class="secondary" data-stay-material-download="${esc(file.file_id)}" data-name="${esc(file.original_name)}">下载</button>`,'file_id'):'<div class="empty">暂无申请材料示例</div>';
  const dialog=modal(batch?.batch_name||'留宿通知',`<p>开放时间：${esc(batch?.open_start_date||'-')} 至 ${esc(batch?.open_end_date||'-')}</p><p>申请截止：${esc(batch?.student_deadline||batch?.application_deadline||'-')}</p><h3>留宿注意事项</h3><div class="stay-notice-text">${esc(batch?.instructions||'暂无注意事项')}</div><h3>申请材料示例</h3>${files}`,null);bindMaterialDownloads(dialog);return;
 }
 if(action==='stay-export'){download('stay-applications.json',state.data.stays);return;}
 if(action==='stay-apply'||action==='stay-edit'){const a=(action==='stay-edit'?row:state.data.stays.find(x=>String(x.batch_id)===id))||{};const batchId=action==='stay-apply'?id:a.batch_id;const dialog=modal('留宿申请',rangesForm(a)+check('submitNow','保存后提交审核',true),async(d,f)=>{const saved=await post('/stay/applications',{batchId,reason:d.reason,dateRanges:getRanges(f)});if(d.submitNow)await post(`/stay/applications/${saved.applicationId}/submit`);});bindRanges(dialog);return;}
 if(['stay-submit','stay-withdraw'].includes(action)){await post(`/stay/applications/${id}/${action.slice(5)}`);await render();notify('操作成功');return;}
 if(action==='stay-lock'||action==='stay-unlock'){await post(`/stay/applications/${id}/lock`,{locked:action==='stay-lock'});await render();notify('操作成功');return;}
 if(action==='stay-lock-all'){const rows=state.data.stays.filter(x=>String(x.batch_id)===id&&x.current_status==='PENDING_REVIEW');if(!rows.length)throw new Error('没有可锁定的待审核申请');modal('批量锁定',`<p>锁定 ${rows.length} 份已提交申请</p>`,async()=>{await post(`/stay/batches/${id}/lock`);},'锁定');return;}
 if(action==='stay-review'){modal('留宿审核',`<p>${esc(row.student_name)}：${esc(row.dates)}</p><p>${esc(row.reason)}</p>`+select('pass','审核结论',[['true','通过'],['false','退回修改']])+field('reason','审核意见','textarea','',false)+field('resubmitDeadline','退回后重交截止','datetime-local','',false),d=>post(`/stay/applications/${id}/review`,{...d,pass:d.pass==='true'}));return;}
 if(action==='stay-batch-new'||action==='stay-batch-edit'){
  const materials=batch?.materials||[],existing=materials.map(file=>`<label class="check"><input type="checkbox" name="removeMaterial" value="${esc(file.file_id)}"><span>${esc(file.original_name)}（移除）</span></label>`).join('');
  const body=(!batch?field('batchCode','批次编号','text',`STAY-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`):'')+field('batchName','批次名称','text',batch?.batch_name||'')+field('academicYear','年份','number',batch?.academic_year||new Date().getFullYear())+select('vacationType','假期',[['SUMMER','暑假'],['WINTER','寒假']],batch?.vacation_type||'SUMMER')+field('openStartDate','开放开始','date',batch?.open_start_date||'')+field('openEndDate','开放结束','date',batch?.open_end_date||'')+field('applicationDeadline','申请截止','datetime-local',String(batch?.application_deadline||'').replace(' ','T').slice(0,16))+field('instructions','留宿注意事项','textarea',batch?.instructions||'')+`<label class="field"><span>申请材料示例（PDF、Word、PNG、JPEG，单个不超过5MB）</span><input type="file" name="materialFiles" multiple accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"></label>${existing?`<div class="stay-existing-materials">${existing}</div>`:''}`;
  let savedBatchId=batch?.batch_id||null,uploadedCount=0;
  const dialog=modal(batch?'编辑留宿批次':'新增留宿批次',body,async(d,form)=>{
   const payload={...d,academicYear:Number(d.academicYear)};let saved;
   if(savedBatchId)saved=await put(`/stay/batches/${savedBatchId}`,payload);else{saved=await post('/stay/batches',payload);savedBatchId=saved.batchId;}
   const files=[...form.elements.materialFiles.files];
   for(let i=uploadedCount;i<files.length;i++){const data=new FormData();data.set('file',files[i]);await api(`/stay/batches/${savedBatchId}/materials`,{method:'POST',body:data});uploadedCount=i+1;}
   for(const remove of form.querySelectorAll('[name="removeMaterial"]:checked'))await api(`/stay/batches/${savedBatchId}/materials/${remove.value}`,{method:'DELETE'});
   return '留宿批次已保存';
  });
  bindMaterialDownloads(dialog);return;
 }
 if(action==='stay-publish'){
  if(role()==='ADMIN'){await post(`/stay/batches/${id}/publish`,{applicationDeadline:batch.application_deadline,autoLock:true});await render();notify('全校留宿通知已发布');return;}
  const buildings=await api('/buildings');modal('发布楼栋留宿申请',select('buildingId','楼栋',buildings.map(b=>[b.building_id,b.building_name]))+field('applicationDeadline','申请截止','datetime-local')+check('autoLock','截止后自动锁定',true),d=>post(`/stay/batches/${id}/publish`,{...d,autoLock:!!d.autoLock}));return;
 }
 if(action==='stay-supplement'){const homes=await api('/accommodations/current');const dialog=modal(role()==='ADMIN'?'人工添加留宿申请':'逾期补录',select('studentId','学生',homes.map(h=>[h.student_id,`${h.student_name} · ${h.building_name} ${h.room_no}`]))+rangesForm(),(d,f)=>post('/stay/supplements',{batchId:id,studentId:d.studentId,reason:d.reason,dateRanges:getRanges(f)}));bindRanges(dialog);return;}
 if(action==='stay-export-csv'){downloadCsv('留宿记录.csv',state.page==='stayHistory'?state.data.stays:state.data.stays||[]);return;}
 if(action==='stay-detail'){modal('留宿申请详情',`<h3>${esc(row.student_name)} · ${esc(row.batch_name)}</h3><p>${esc(row.dates)}</p><p>${esc(row.reason)}</p><p>来源：${esc(row.source)}</p><p>归档原因：${esc(row.archive_reason||'-')}</p><h3>审核记录</h3>${table(row.reviews,[['result','结论'],['reason','意见'],['reviewed_at','时间']])}`,null);}
}
