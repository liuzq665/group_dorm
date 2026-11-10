import { repairPage, repairHistoryPage, repairerStatsPage, repairerRecordPage, repairAction, cascadeRepairFilters } from './repairs.js';
import { stayPage, staySchoolPage, stayManagerPage, stayHistoryPage, stayAction } from './stay.js';
import { adminPages, adminAction, cascadeDirectoryFilters, cascadeResourceFilters, cascadeAccommodationFilters, cascadeAccommodationHistoryFilters, checkboxChoices, bindChoiceDropdown } from './management.js';

export const API = '/api/v1';
const roles = { STUDENT:'学生端', DORM_MANAGER:'宿管端', REPAIRER:'维修人员端', ADMIN:'系统管理员端' };
const dashboardCharts=[];
export const statuses = { DRAFT:'草稿', PENDING_REVIEW:'待审核', PENDING_EDIT:'待修改', UNDER_REVIEW:'审核中', PENDING_ASSIGN:'待派单', PENDING_ACCEPT:'待接单', ACCEPTED:'已接单', DELAYED:'维修延期', REPAIRED:'已维修', CONFIRMED:'已确认', ARCHIVED:'已归档', PENDING_MANUAL:'待人工处理', APPROVED:'已通过', COMPLETED:'已完成', CANCELLED:'已撤销', CLOSED:'已关闭', REJECTED:'已拒单', TIMEOUT:'接单超时', REPAIR_TIMEOUT:'维修超时', RETURNED:'退回修改', PENDING:'待处理' };
export const state = { token:sessionStorage.getItem('dorm_token'), user:JSON.parse(sessionStorage.getItem('dorm_user') || 'null'), page:'dashboard', data:{} };
export const role = () => state.user?.role;
export const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const status = value => `<span class="status ${esc(value)}">${esc(statuses[value] || value || '-')}</span>`;
export const button = (label, action, id='', extra='') => `<button type="button" class="secondary" data-action="${action}" data-id="${esc(id)}" ${extra}>${label}</button>`;
export const post = (path, data={}) => api(path, {method:'POST',body:JSON.stringify(data)});
export const put = (path, data) => api(path, {method:'PUT',body:JSON.stringify(data)});
export const contactPattern='(?:\\+?86)?1[3-9][0-9]{9}|0[0-9]{2,3}-?[0-9]{7,8}';
export const contactAttrs=` inputmode="tel" autocomplete="tel" maxlength="30" pattern="${contactPattern}" title="请填写11位手机号（如13800000000）或带区号的固定电话（如010-88886666）"`;
export async function api(path, options={}) {
  const headers = {...options.headers};
  if (!(options.body instanceof FormData)) headers['Content-Type']='application/json';
  if (state.token) headers.Authorization=`Bearer ${state.token}`;
  const response = await fetch(`${API}${path}`, {...options,headers});
  const body = await response.json();
  if(response.status===401 && state.token){clearSession();login();}
  if(!response.ok || body.code!==0) throw new Error(body.message || `请求失败 (${response.status})`);
  return body.data;
}
function clearSession(){navExpansion.clear();state.token=null;state.user=null;sessionStorage.removeItem('dorm_token');sessionStorage.removeItem('dorm_user');}
export function notify(message,error=false){let node=document.querySelector('#toast');if(!node)return;node.textContent=message;node.className=error?'toast error-toast':'toast';node.hidden=false;setTimeout(()=>node.hidden=true,4000);}
export function field(name,label,type='text',value='',required=true,extra=''){return `<label class="field"><span>${label}</span>${type==='textarea'?`<textarea name="${name}" ${required?'required':''}>${esc(value)}</textarea>`:`<input name="${name}" type="${type}" value="${esc(value)}" ${required?'required':''} ${extra}>`}</label>`;}
export function select(name,label,items,value='',multiple=false,required=true){return `<label class="field"><span>${label}</span><select name="${name}" aria-label="${esc(label)}" ${multiple?'multiple':required?'required':''}>${items.map(([id,text])=>`<option value="${esc(id)}" ${(multiple?Array.from(value||[]).map(String).includes(String(id)):String(id)===String(value))?'selected':''}>${esc(text)}</option>`).join('')}</select></label>`;}
export function check(name,label,checked=false){return `<label class="check"><input type="checkbox" name="${name}" ${checked?'checked':''}> ${label}</label>`;}
let tableSequence=0;
const tablePageSize=8;
function tableMarkup(rows,columns,actions,idKey,pageId,pageSizeOverride){
  const pageSize=pageSizeOverride||tablePageSize;
  const paginated=true;
  const pageCount=Math.max(1,Math.ceil(rows.length/pageSize));
  const activePage=Math.min(state.data.tablePages?.[pageId]||1,pageCount);
  const body=rows.map((row,index)=>`<tr data-row-id="${esc(row[idKey])}" data-table-row-index="${index}" ${index<pageSize*(activePage-1)||index>=pageSize*activePage?'hidden':''}>${columns.map(([key,label])=>{const value=row[key],cell=key==='current_status'?status(value):key==='enabled_toggle'?`<button type="button" class="toggle-switch ${Number(row.enabled)===1?'is-on':''}" role="switch" aria-checked="${Number(row.enabled)===1}" aria-label="${Number(row.enabled)===1?'启用':'禁用'}" data-action="dictionary-enabled" data-id="${esc(row.work_type_id??row.category_id)}" data-type="${row.work_type_id?'work-types':'categories'}"><span></span></button>`:key==='enabled'?(Number(value)===1?'启用':'停用'):['on_duty','manager_on_duty'].includes(key)?(Number(value)===1?'在岗':'离岗'):key==='gender'?({MALE:'男',FEMALE:'女',OTHER:'其他'}[value]||'未填写'):key==='enrollment_status'?({ENROLLED:'在读',SUSPENDED:'休学',GRADUATED:'毕业',WITHDRAWN:'退学',UNKNOWN:'未登记'}[value]||'-'):esc(value??'-');return `<td data-label="${esc(label)}">${cell}</td>`;}).join('')}${actions?`<td data-label="操作"><div class="actions">${actions(row)||'-'}</div></td>`:''}</tr>`).join('');
  const pagination=paginated&&rows.length>pageSize?`<div class="table-pagination"><span>共 ${rows.length} 条</span><div class="table-page-controls"><button type="button" class="secondary" data-table-page-step="-1" ${activePage===1?'disabled':''}>上一页</button><span data-table-page-label>${activePage} / ${pageCount}</span><input class="table-page-input" data-table-page-input type="number" min="1" max="${pageCount}" step="1" value="${activePage}" aria-label="跳转到页码"><button type="button" class="secondary" data-table-page-jump>跳转</button><button type="button" class="secondary" data-table-page-step="1" ${activePage===pageCount?'disabled':''}>下一页</button></div></div>`:'';
  return `<div class="table-wrap table-component" data-table-id="${esc(pageId)}" data-table-page-size="${pageSize}"><table class="table"><thead><tr>${columns.map(([,label])=>`<th>${label}</th>`).join('')}${actions?'<th>操作</th>':''}</tr></thead><tbody>${body}</tbody></table>${pagination}</div>`;
}
export function bindTablePagination(container){
  container.querySelectorAll('[data-table-page-step]').forEach(button=>button.onclick=()=>{
    const component=button.closest('.table-component'),pageId=component?.dataset.tableId;if(!pageId)return;
    const current=state.data.tablePages?.[pageId]||1;
    state.data.tablePages??={};state.data.tablePages[pageId]=Math.max(1,current+Number(button.dataset.tablePageStep));
    applyTablePage(component);
  });
  container.querySelectorAll('[data-table-page-jump]').forEach(button=>button.onclick=()=>{
    const component=button.closest('.table-component'),pageId=component?.dataset.tableId;
    const input=component?.querySelector('[data-table-page-input]'),label=component?.querySelector('[data-table-page-label]');
    if(!pageId||!input||!label)return;
    const requested=input.value.trim(),current=Number(label.textContent.split('/')[0].trim())||1;
    if(!/^\d+$/.test(requested)){input.value=String(current);return;}
    const pageCount=Number(label.textContent.split('/').pop().trim())||1;
    state.data.tablePages??={};state.data.tablePages[pageId]=Math.min(pageCount,Math.max(1,Number(requested)));
    applyTablePage(component);
  });
  container.querySelectorAll('[data-table-page-input]').forEach(input=>input.onkeydown=event=>{
    if(event.key==='Enter'){event.preventDefault();input.closest('.table-component')?.querySelector('[data-table-page-jump]')?.click();}
  });
}
function applyTablePage(component){
  const pageId=component.dataset.tableId,allRows=[...component.querySelectorAll('tbody tr')],query=component.dataset.tableQuery||'';
  const matching=allRows.filter(row=>row.textContent.toLowerCase().includes(query));
  const pageSize=Number(component.dataset.tablePageSize)||tablePageSize;
  const pageCount=Math.max(1,Math.ceil(matching.length/pageSize)),page=Math.min(state.data.tablePages?.[pageId]||1,pageCount),first=(page-1)*pageSize;
  state.data.tablePages??={};state.data.tablePages[pageId]=page;
  const visible=new Set(matching.slice(first,first+pageSize));
  allRows.forEach(row=>row.hidden=!visible.has(row));
  const pagination=component.querySelector('.table-pagination');
  if(pagination){pagination.querySelector(':scope > span').textContent=`共 ${matching.length} 条`;pagination.querySelector('[data-table-page-label]').textContent=`${page} / ${pageCount}`;pagination.querySelector('[data-table-page-input]').value=String(page);pagination.querySelector('[data-table-page-input]').max=String(pageCount);pagination.querySelector('[data-table-page-step="-1"]').disabled=page===1;pagination.querySelector('[data-table-page-step="1"]').disabled=page===pageCount;}
  const table=component.querySelector('.role-table,.resource-table,.message-table,.bulk-table')||component;
  const all=table.querySelector('[data-select-all],[data-resource-select-all],[data-message-select-all],[data-bulk-select-all]'),inputs=[...table.querySelectorAll('[data-select-row],[data-resource-select-row],[data-message-select-row],[data-bulk-select-row]')].filter(input=>!input.closest('tr').hidden),count=inputs.filter(input=>input.checked).length;
  if(all){all.checked=inputs.length>0&&count===inputs.length;all.indeterminate=count>0&&count<inputs.length;}
}
export function filterTableComponents(query,root=document){
  root.querySelectorAll('.table-component').forEach(component=>{component.dataset.tableQuery=query.toLowerCase();state.data.tablePages??={};state.data.tablePages[component.dataset.tableId]=1;applyTablePage(component);});
}
export function table(rows,columns,actions=()=>'',idKey='id',pageSizeOverride){
  if(!rows.length)return '<div class="empty">暂无记录</div>';
  const pageId=`${state.page}-${tableSequence++}`;
  return tableMarkup(rows,columns,actions,idKey,pageId,pageSizeOverride);
}
export function modal(title,html,onSubmit,submitLabel='保存',stack=false){
  if(!stack)document.querySelector('dialog')?.remove();
  const dialog=document.createElement('dialog');dialog.className=onSubmit&&html.length<=320&&!/<(input|select|textarea|table|img|iframe|fieldset|video)\b/i.test(html)?'dialog dialog-compact':'dialog';
  dialog.innerHTML=`<form id="dialog-form"><header class="dialog-header"><h2>${esc(title)}</h2><button type="button" class="icon-button" title="关闭" aria-label="关闭">&times;</button></header><div class="dialog-body">${html}</div><p class="error" role="alert"></p><footer class="dialog-footer">${onSubmit?`<button class="primary" type="submit">${submitLabel}</button>`:''}<button type="button" class="secondary" data-close>${stack?'返回详情':'关闭'}</button></footer></form>`;
  document.body.append(dialog);dialog.showModal();
  bindTablePagination(dialog);
  dialog.querySelectorAll('[data-close],.icon-button').forEach(b=>b.onclick=()=>dialog.close());
  dialog.onclose=()=>{dialog.querySelectorAll('img,iframe').forEach(i=>{if(i.src.startsWith('blob:'))URL.revokeObjectURL(i.src);});dialog.remove();};
  dialog.querySelector('form').onsubmit=async event=>{event.preventDefault();if(!onSubmit)return;const submit=dialog.querySelector('[type=submit]');submit.disabled=true;try{const result=await onSubmit(Object.fromEntries(new FormData(event.currentTarget)),event.currentTarget);dialog.close();await render();notify(typeof result==='string'?result:'操作成功');}catch(error){dialog.querySelector('[role=alert]').textContent=error.message;}finally{submit.disabled=false;}};
  return dialog;
}
export const photoField=(required=false)=>`<label class="field"><span>现场照片</span><input name="photos" type="file" accept="image/png,image/jpeg" multiple ${required?'required':''}></label>`;
export async function upload(form){const ids=[];for(const selectedFile of form.elements.photos?.files||[]){const file=await normalizeImageUpload(selectedFile),body=new FormData();body.set('file',file);ids.push((await api('/files',{method:'POST',body})).fileId);}return ids;}
export async function normalizeImageUpload(file){if(!file.type.startsWith('image/')&&!/\.(png|jpe?g|gif|webp|bmp|avif|heic|heif|svg)$/i.test(file.name))return file;let bitmap;try{bitmap=await createImageBitmap(file);}catch{throw new Error(`无法解码图片：${file.name}`);}const canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;canvas.getContext('2d').drawImage(bitmap,0,0);bitmap.close();const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw new Error(`图片转换失败：${file.name}`);if(blob.size>5*1024*1024)throw new Error(`图片转换后超过5MB：${file.name}`);const stem=file.name.replace(/\.[^.]+$/,'');return new File([blob],`${stem}.png`,{type:'image/png'});}
export async function photos(dialog,items){const target=dialog.querySelector('.photo-list');if(!target||!items.length)return;for(const file of items){const response=await fetch(`${API}/files/${file.file_id}`,{headers:{Authorization:`Bearer ${state.token}`}});if(!response.ok){const error=document.createElement('p');error.className='error';error.textContent=`图片 ${file.original_name||file.file_id} 加载失败（${response.status}）`;target.append(error);continue;}const image=new Image();image.alt=file.original_name;image.src=URL.createObjectURL(await response.blob());target.append(image);}}
export function download(name,data,type='application/json'){const url=URL.createObjectURL(new Blob([typeof data==='string'?data:JSON.stringify(data,null,2)],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export function selectedRows(type,rows,idKey){const ids=state.data.bulkSelections?.[type]||[],resources=[...document.querySelectorAll(`.resource-table[data-resource-type="${CSS.escape(type)}"] [data-resource-select-row]:checked`)].map(input=>input.value),selected=ids.length?ids:resources;return selected.length?rows.filter(row=>selected.includes(String(row[idKey]))):rows;}
export function selectableRowsTable(rows,columns,actions,idKey,type,pageSize){
 const html=table(rows,columns,actions,idKey,pageSize);
 return html.replace('<thead><tr>','<thead><tr><th class="select-col"><input type="checkbox" data-bulk-select-all aria-label="选择本页"></th>')
  .replace(/(<tr data-row-id="([^"]*)"[^>]*>)/g,(_,row,id)=>`${row}<td class="select-col"><input type="checkbox" data-bulk-select-row value="${esc(id)}" aria-label="选择记录"></td>`)
  .replace('<div class="table-wrap table-component"',`<div class="table-wrap table-component bulk-table" data-bulk-type="${esc(type)}"`);
}
const titles={dashboard:'工作台',repairs:'报修管理',repairHistory:'报修历史',repairerStats:'维修记录统计',repairerRejects:'拒单记录',repairerAcceptTimeouts:'接单超时记录',repairerRepairTimeouts:'超时未修好记录',repairerDelays:'延期记录',repairerReworks:'重修工单记录',stay:'假期留宿',staySchool:'全校留宿',stayManager:'全楼留宿',stayHistory:'留宿历史',accommodation:'住宿分配',accommodationHistory:'住宿历史',studentAccommodationHistory:'住宿历史',messages:'消息中心',buildings:'楼栋管理',rooms:'宿舍管理',beds:'床位管理',students:'学生管理',managers:'宿管管理',repairers:'维修人员管理',logs:'操作日志',profile:'个人信息',rules:'报修规则',data:'数据备份'};
const navExpansion=new Map();
const originalMenus=menus;
menus=()=>originalMenus().map(item=>Array.isArray(item)||item.key!=='repair-records'?item:{...item,children:item.children.filter(([key])=>key!=='repairerStats')});
function menus(){const common=[['messages','消息中心'],['profile','个人信息']];switch(role()){case 'STUDENT':return [...common,{key:'dorm',label:'住宿管理',children:[['accommodation','我的住宿'],['studentAccommodationHistory','住宿历史']]},{key:'repair',label:'报修管理',children:[['repairs','我的报修'],['repairHistory','报修历史']]},['stay','假期留宿']];case 'DORM_MANAGER':return [['dashboard','工作台'],...common,{key:'repair',label:'报修管理',children:[['repairs','全楼报修'],['repairHistory','报修历史']]},{key:'stay',label:'留宿管理',children:[['stayManager','全楼留宿'],['stayHistory','留宿历史']]},{key:'dorm',label:'住宿管理',children:[['rooms','宿舍管理'],['beds','床位管理'],['accommodationHistory','住宿历史']]},['students','学生管理']];case 'REPAIRER':return [['dashboard','工作台'],...common,['repairs','维修任务'],{key:'repair-records',label:'维修记录',children:[['repairerStats','统计概览'],['repairerRejects','拒单记录'],['repairerAcceptTimeouts','接单超时记录'],['repairerRepairTimeouts','超时未修好记录'],['repairerDelays','延期记录'],['repairerReworks','重修工单记录']]},['repairHistory','报修历史']];default:return [['dashboard','工作台'],...common,{key:'repair',label:'报修管理',children:[['repairs','全校报修'],['repairHistory','报修历史'],['rules','报修规则']]},{key:'stay',label:'留宿管理',children:[['staySchool','全校留宿'],['stayHistory','留宿历史']]},{key:'dorm',label:'住宿管理',children:[['buildings','楼栋管理'],['rooms','宿舍管理'],['beds','床位管理'],['accommodationHistory','住宿历史']]},{key:'roles',label:'角色管理',children:[['students','学生管理'],['managers','宿管管理'],['repairers','维修人员管理']]},['logs','操作日志'],['data','数据备份']];}}
function layout(content){document.querySelectorAll('.nav-group').forEach(group=>navExpansion.set(group.dataset.navGroup,group.open));const menu=menus().map(item=>Array.isArray(item)?`<button data-page="${item[0]}" class="${state.page===item[0]?'active':''}">${item[0]==='messages'&&Number(state.data.unreadCount)>0?`${item[1]}<span class="unread-badge">${state.data.unreadCount}</span>`:item[1]}</button>`:`<details class="nav-group" data-nav-group="${item.key}" ${navExpansion.get(item.key)?'open':''}><summary class="${item.children.some(([key])=>state.page===key)?'active':''}">${item.label}</summary><div class="nav-children">${item.children.map(([key,label])=>`<button data-page="${key}" class="${state.page===key?'active':''}">${label}</button>`).join('')}</div></details>`).join('');document.querySelector('#app').innerHTML=`<div class="shell ${role()==='ADMIN'?'admin-shell':''}"><aside class="sidebar"><h2>宿舍事务平台</h2><div class="role-tag">${roles[role()]}</div><nav class="nav">${menu}</nav><button class="logout" id="logout">退出登录</button></aside><main class="content"><div class="topbar"><div><div class="muted">${roles[role()]}</div><h1>${state.page==='repairs'?({STUDENT:'我的报修',DORM_MANAGER:'全楼报修',REPAIRER:'我的维修任务',ADMIN:'全校报修'}[role()]||titles[state.page]):titles[state.page]}</h1></div><span>${esc(state.user.name)}</span></div>${content}</main></div><div id="toast" class="toast" role="status" hidden></div>`;
 document.querySelectorAll('button[data-page]').forEach(b=>b.onclick=()=>{state.page=b.dataset.page;render();});document.querySelector('#logout').onclick=()=>modal('退出登录','确定退出当前账号吗？',async()=>{try{await post('/auth/logout');}finally{clearSession();}return '已退出登录';},'确认退出');
}
function login(error=''){document.querySelector('#app').innerHTML=`<div class="login"><form class="login-panel" id="login-form"><div class="brand-mark">宿</div><h1>宿舍事务平台</h1>${field('loginAccount','账号','text','')}${field('password','密码','password','')}<p class="error" role="alert">${esc(error)}</p><button class="primary full">登录</button></form></div>`;document.querySelector('#login-form').onsubmit=async e=>{e.preventDefault();const button=e.currentTarget.querySelector('button');button.disabled=true;try{const data=await post('/auth/login',Object.fromEntries(new FormData(e.currentTarget)));state.token=data.token;state.user=data.user;sessionStorage.setItem('dorm_token',data.token);sessionStorage.setItem('dorm_user',JSON.stringify(data.user));state.page=data.user.role==='STUDENT'?'repairs':'dashboard';await render();}catch(e){login(e.message);}};}
const pages={...adminPages,repairs:repairPage,repairHistory:repairHistoryPage,repairerStats:repairerStatsPage,repairerRejects:repairerRecordPage,repairerAcceptTimeouts:repairerRecordPage,repairerRepairTimeouts:repairerRecordPage,repairerDelays:repairerRecordPage,repairerReworks:repairerRecordPage,stay:stayPage,staySchool:staySchoolPage,stayManager:stayManagerPage,stayHistory:stayHistoryPage,
 async dashboard(){
  const d=await api('/dashboard');state.data.dashboard=d;state.data.unreadCount=d.unread;let charts='';
  if(role()==='ADMIN'){
   const period=state.data.stayPeriod||'year1',[batches,buildings]=await Promise.all([api('/stay/all-batches'),api('/buildings')]);const batchId=state.data.stayBatch??'all';state.data.dashboardBatches=batches;if(state.data.stayBatch===undefined)state.data.stayBatch=batchId;const buildingId=state.data.stayBuilding||'';
   state.data.stayAnalysis=await api(`/dashboard/stay-analysis?period=${encodeURIComponent(period)}&batchId=${encodeURIComponent(batchId)}&buildingId=${encodeURIComponent(buildingId)}`);
   const ratingPeriod=state.data.ratingPeriod||'year1';
   state.data.repairEvaluationAnalysis=await api(`/dashboard/repair-evaluation?period=${encodeURIComponent(ratingPeriod)}`);
    charts=`<article id="stay-analysis" class="dashboard-chart-panel dashboard-wide stay-analysis-panel"><div class="toolbar"><h2>留宿人数</h2><div class="dashboard-chart-filters">${select('stayPeriod','年份筛选',[['year1','近一年'],['year10','近十年'],['all','全部年份']],period,false,false)}${select('stayBatch','留宿批次',[['all','全部批次'],...batches.map(x=>[x.batch_id,x.batch_name])],batchId,false,false)}${select('stayBuilding','楼栋',[['','全部楼栋'],...buildings.map(x=>[x.building_id,x.building_name])],buildingId,false,false)}</div></div><div id="stay-analysis-chart" class="dashboard-chart" role="img" aria-label="留宿人数分析"></div></article>`+
    `<article id="repair-rating" class="dashboard-chart-panel dashboard-wide dashboard-rating-panel"><div class="toolbar"><h2>维修评价</h2><div class="dashboard-chart-filters">${select('ratingPeriod','年份',[['year1','近一年（默认）'],['year10','近十年'],['all','全部']],ratingPeriod,false,false)}</div></div><p class="dashboard-rating-summary">${Number(state.data.repairEvaluationAnalysis.averageScore).toFixed(1)} / 5 · ${ratingPeriod==='year1'?'近一年':ratingPeriod==='year10'?'近十年':'全部年份'}综合评分</p><div id="repair-rating-chart" class="dashboard-chart" role="img" aria-label="维修评价统计"></div></article>`+
    `<article id="accommodation" class="dashboard-chart-panel accommodation-chart-panel dashboard-wide"><div class="toolbar"><h2>全校住宿生</h2></div><span class="muted">${d.accommodationStats.year} 年在读学生 ${d.accommodationStats.students} 人</span><div class="accommodation-chart-layout"><div id="accommodation-status-chart" class="dashboard-chart" role="img" aria-label="学生住宿情况"></div><dl class="accommodation-chart-metrics"><div><dt>已住宿</dt><dd>${d.accommodationStats.housed} 人</dd></div><div><dt>未住宿</dt><dd>${d.accommodationStats.unhoused} 人</dd></div><div><dt>床位使用率</dt><dd>${d.accommodationStats.beds?Math.round(d.accommodationStats.occupiedBeds/d.accommodationStats.beds*100):0}%</dd></div><div><dt>空闲床位</dt><dd>${d.accommodationStats.availableBeds} 张</dd></div></dl></div></article>`+
    `<article id="stay-status" class="dashboard-chart-panel"><h2>留宿申请状态</h2><p class="dashboard-chart-note">柱状图：统计全校申请单的当前状态，每份申请计1单，排除草稿。月度图：统计本年度按创建月份计入的申请单数，排除草稿。</p><div id="stay-status-chart" class="dashboard-chart" role="img" aria-label="全校留宿申请单当前状态数量"></div><div id="stay-monthly-chart" class="dashboard-chart dashboard-monthly-chart" role="img" aria-label="全校本年度每月新建留宿申请单数量"></div></article>`+
    `<article id="repair-status" class="dashboard-chart-panel"><h2>报修工单状态</h2><p class="dashboard-chart-note">柱状图：统计全校工单的当前状态，每张工单计1单；草稿、待修改不计入，已撤销、已关闭并入已归档。月度图：统计本年度按创建月份计入的非草稿、非撤销工单数。</p><div id="repair-status-chart" class="dashboard-chart" role="img" aria-label="全校报修工单当前状态数量"></div><div id="repair-monthly-chart" class="dashboard-chart dashboard-monthly-chart" role="img" aria-label="全校本年度每月新建有效报修工单数量"></div></article>`;
   charts=`<div class="dashboard-chart-grid">${charts}</div>`;
  }
  let managerEval='',managerCharts='',repairerCharts='',repairerOverview='';
  if(role()==='DORM_MANAGER'){
   const [ev,stayAnalysis]=await Promise.all([api('/dashboard/repair-evaluation?period=year1'),api('/dashboard/stay-analysis?period=year1&batchId=all')]);state.data.managerEvaluation=ev;state.data.stayAnalysis=stayAnalysis;state.data.repairEvaluationAnalysis=ev;state.data.ratingPeriod='year1';
   managerEval=`<section class="dashboard-chart-panel dashboard-wide"><h2>维修评价（负责楼栋）</h2><p class="dashboard-chart-note">仅统计本人负责楼栋内已提交的学生评价；未评价工单不计入平均分。</p><p class="dashboard-rating-summary">近一年综合评分：${Number(ev.averageScore||0).toFixed(2)} / 5，共 ${(ev.repairers||[]).reduce((sum,row)=>sum+Number(row.total||0),0)} 条评价</p><div id="repair-rating-chart" class="dashboard-chart" role="img" aria-label="负责楼栋维修评价统计"></div>${table(ev.repairers||[],[['repairer_name','维修人员'],['total','评价数'],['averageScore','平均分']])}</section>`;
   managerCharts=`<div class="dashboard-chart-grid"><article class="dashboard-chart-panel"><h2>留宿申请状态</h2><p class="dashboard-chart-note">柱状图：统计本人负责楼栋内申请单的当前状态，每份申请计1单，排除草稿。月度图：统计本年度按创建月份计入的申请单数，排除草稿。</p><div id="stay-status-chart" class="dashboard-chart"></div><div id="stay-monthly-chart" class="dashboard-chart dashboard-monthly-chart"></div></article><article class="dashboard-chart-panel"><h2>报修工单状态</h2><p class="dashboard-chart-note">柱状图：统计本人负责楼栋内工单的当前状态，每张工单计1单；草稿、待修改不计入，已撤销、已关闭并入已归档。月度图：统计本年度按创建月份计入的非草稿、非撤销工单数。</p><div id="repair-status-chart" class="dashboard-chart"></div><div id="repair-monthly-chart" class="dashboard-chart dashboard-monthly-chart"></div></article><article class="dashboard-chart-panel dashboard-wide"><h2>负责楼栋当前住宿</h2><p class="dashboard-chart-note">仅统计本人负责楼栋的床位；环形图分别表示已占床位和空闲床位数量。</p><div id="accommodation-status-chart" class="dashboard-chart"></div><div class="dashboard-accommodation-counts">已占床位 ${d.accommodationStats.occupiedBeds} 张 · 空闲床位 ${d.accommodationStats.availableBeds} 张</div></article><article class="dashboard-chart-panel dashboard-wide"><h2>留宿人数</h2><p class="dashboard-chart-note">按本人负责楼栋统计已通过及已完成的留宿申请人数，按批次区分。</p><div id="stay-analysis-chart" class="dashboard-chart"></div></article></div>`;
  }
  if(role()==='REPAIRER'){
   const currentYear=new Date().getFullYear();
   const eventYear=state.data.repairerEventYear??String(currentYear),eventMonth=state.data.repairerEventMonth??'';
   const ratingYear=state.data.repairerRatingYear??String(currentYear),ratingMonth=state.data.repairerRatingMonth??'';
   const params=new URLSearchParams();
   if(eventYear)params.set('eventYear',eventYear);
   if(eventMonth)params.set('eventMonth',eventMonth);
   if(ratingYear)params.set('ratingYear',ratingYear);
   if(ratingMonth)params.set('ratingMonth',ratingMonth);
   const [stats,overviewStats]=await Promise.all([api(`/repairer-stats?${params}`),api('/repairer-stats?eventYear=&ratingYear=')]);state.data.repairerDashboardStats=stats;state.data.repairerOverviewStats=overviewStats;
   const overviewCards=[['pendingAccept','待接单'],['inRepair','维修中'],['delayedOrders','维修延期'],['pendingConfirm','待确认'],['current','当前工单'],['history','历史工单'],['rejected','拒单次数'],['acceptTimeout','接单超时'],['repairTimeout','超时未修好'],['delays','延期次数'],['reworks','重修次数'],['evaluations','收到评价'],['averageScore','平均评分']];
   repairerOverview=`<section class="panel repairer-overview"><div class="toolbar"><h2>维修统计概览</h2><span class="muted">当前维修人员关联的工单与评价</span></div><div class="grid repairer-overview-grid">${overviewCards.map(([key,label])=>`<div class="stat"><span class="muted">${label}</span><strong>${key==='averageScore'?Number(overviewStats[key]||0).toFixed(2):Number(overviewStats[key]||0)}</strong></div>`).join('')}</div></section>`;
   const years=[...new Set([currentYear,...(stats.availableYears||[])])].sort((a,b)=>b-a).map(year=>[String(year),`${year}年`]);
   const yearItems=[['','全部年份'],...years],monthItems=[['','全年'],...Array.from({length:12},(_,index)=>[String(index+1),`${index+1}月`])];
   const monthSelect=(name,label,year,value)=>select(name,label,monthItems,value,false,false).replace(`name="${name}"`,`name="${name}"${year?'':' disabled'}`);
   const periodLabel=(year,month)=>year?`${year}年${month?`${month}月`:'全年'}`:'全部年份';
   const recordFilters=`${select('repairerEventYear','年份',yearItems,eventYear,false,false)}${monthSelect('repairerEventMonth','月份',eventYear,eventMonth)}`;
   const ratingFilters=`${select('repairerRatingYear','年份',yearItems,ratingYear,false,false)}${monthSelect('repairerRatingMonth','月份',ratingYear,ratingMonth)}`;
   repairerCharts=`<div class="dashboard-chart-grid"><article class="dashboard-chart-panel dashboard-wide"><div class="toolbar"><h2>个人工单记录</h2><div class="dashboard-chart-filters">${recordFilters}</div></div><p class="dashboard-chart-note">统计派给当前维修人员的拒单、接单超时、维修超时、延期申请和重修事件；范围：${periodLabel(eventYear,eventMonth)}。</p><div id="repairer-record-chart" class="dashboard-chart"></div></article><article class="dashboard-chart-panel dashboard-wide"><div class="toolbar"><h2>个人维修评价</h2><div class="dashboard-chart-filters">${ratingFilters}</div></div><p class="dashboard-chart-note">只统计当前维修人员收到的已提交评价，未评价工单不计入；按选定年月汇总综合平均评分。</p><p class="dashboard-rating-summary">${(stats.ratingSummary||{evaluationCount:0}).evaluationCount} 条评价 · ${periodLabel(ratingYear,ratingMonth)}综合评分 ${Number((stats.ratingSummary||{averageScore:0}).averageScore||0).toFixed(2)} / 5</p><div id="repairer-evaluation-chart" class="dashboard-chart"></div></article></div>`;
  }
  const groups=[...(role()==='REPAIRER'?[]:[['repair','报修']]),...(role()==='REPAIRER'?[]:[['stay','留宿']]),['message','消息']];const statusGroups=`<section id="dashboard-top" class="dashboard-status-groups">${groups.map(([group,label])=>{const items=group==='repair'?[['PENDING_REVIEW','待审核'],['PENDING_MANUAL','待人工处理'],['PENDING_ACCEPT','待接单'],['IN_REPAIR','维修中'],['PENDING_CONFIRM','待确认'],['COMPLETED','已完成'],['ARCHIVED','已归档']].map(([status,title])=>[title,(d.repairStatus||[]).find(row=>row.status===status)?.total||0]):group==='stay'?[['stayApproved','当前通过'],['stayCompleted','历史完成'],['stayOpen','开放批次']].map(([key,title])=>[title,d[key]??0]):[['未读消息',d.unread??0]];return `<article class="dashboard-status-group"><h2>${label}</h2>${group==='repair'?'<p class="dashboard-chart-note">以下为当前账号数据范围内各工单当前状态数量，排除草稿和待修改工单。</p>':''}${group==='stay'?'<p class="dashboard-chart-note">以下留宿人数按当前账号数据范围统计；开放批次为当前可申请批次数。</p>':''}<div class="dashboard-status-items">${items.map(([title,value])=>`<div class="stat"><span class="muted">${title}</span><strong>${value??0}</strong></div>`).join('')}</div></article>`;}).join('')}</section>`;
  return `<div class="dashboard-layout ${role()==='REPAIRER'?'repairer-dashboard':''}"><div class="dashboard-main">${statusGroups}${repairerOverview}${managerEval}${charts}${managerCharts}${repairerCharts}</div></div>`;
 },
 async profile(){const p=await api('/profile');state.data.profile=p;const fields=[['姓名',p.real_name],['账号',p.login_account],['联系电话',p.phone],['性别',({MALE:'男',FEMALE:'女'})[p.gender]||'未填写'],['生日',p.birth_date],...(p.role_code==='STUDENT'?[['学号',p.student_no],['学院',p.department_name],['专业',p.major_name],['年级',p.grade],['班级',p.class_name],['学籍状态',p.enrollment_status]]:[]),...(['DORM_MANAGER','REPAIRER','ADMIN'].includes(p.role_code)?[['工号',p.employee_no],['入职时间',p.hire_date]]:[]),...(p.role_code==='DORM_MANAGER'?[['负责楼栋',p.manager_buildings]]:[]),...(p.role_code==='REPAIRER'?[['负责工种',p.work_types],['负责楼栋',p.repairer_buildings],['在岗状态',Number(p.on_duty)?'在岗':'离岗']]:[]),['账号状态',Number(p.enabled)?'启用':'停用'],['创建时间',p.account_created_at||p.created_at],['更新时间',p.account_updated_at||p.updated_at]];return `<section class="panel"><div class="toolbar"><h3>个人资料</h3><div class="actions">${button('编辑资料','profile-edit')}${button('修改密码','password')}</div></div><dl class="profile-grid">${fields.map(([label,value])=>`<div><dt>${label}</dt><dd>${esc(value??'未填写')}</dd></div>`).join('')}</dl></section>`;},
 async messages(){
  const admin=role()==='ADMIN';
  const sourceOptions=[['ALL','全部'],...(admin?[['SYSTEM','系统通知'],['DORM_MANAGER','宿管发布'],['MINE','我发布的']]:role()==='DORM_MANAGER'?[['SYSTEM','系统通知'],['ADMIN','系统管理员发布'],['MINE','我发布的']]:[['SYSTEM','系统通知'],['ADMIN','系统管理员发布'],['DORM_MANAGER','宿管发布']])];
  const f=state.data.messageFilters??={read:'unread',sender:'ALL'};
  if(!Object.hasOwn(f,'read'))f.read='unread';
  if(!sourceOptions.some(([key])=>key===f.sender))f.sender='ALL';
  const queryFilters={...f};if(f.sender==='MINE'||(admin&&f.sender==='DORM_MANAGER'))delete queryFilters.read;
  const q=new URLSearchParams(Object.entries(queryFilters).filter(([,v])=>v));
  const rows=await api('/messages'+(q.size?'?'+q:''));state.data.messageRowsById=Object.fromEntries(rows.map(row=>[row.message_id,row]));
  const buildings=await api('/buildings').catch(()=>[]);
  const sourceTabs=`<nav class="message-filter-tabs" aria-label="通知来源">${sourceOptions.map(([key,label])=>`<button type="button" class="secondary ${f.sender===key?'active':''}" data-action="message-source" data-id="${key}">${label}</button>`).join('')}</nav>`;
  const showRead=!(f.sender==='MINE'||(admin&&f.sender==='DORM_MANAGER'));
  const columns=[['source_label','通知来源'],['publisher_name','发布人'],['building_names','楼栋'],['title','标题'],['attachment_names','附件'],['created_at','时间'],['read_label','阅读状态']];
  let messageTable=table(rows,columns,r=>`${button('查看详情','message-detail',r.message_id)}${r.is_recipient&&!r.read_at&&(!admin||r.source_label==='系统通知')?button('标为已读','read-message',r.message_id):''}${String(r.publisher_user_id)===String(state.user.id)?button('撤回','message-withdraw',r.message_id):''}${button('删除','message-delete',r.message_id)}`,'message_id',8);
  if(rows.length)messageTable=messageTable.replace('<div class="table-wrap table-component"','<div class="table-wrap table-component message-table"').replace('<thead><tr>','<thead><tr><th class="select-col"><input type="checkbox" data-message-select-all aria-label="全选消息"></th>').replace(/(<tr data-row-id="([^"]*)"[^>]*>)/g,(_,row,id)=>`${row}<td class="select-col"><input type="checkbox" data-message-select-row value="${esc(id)}" aria-label="选择消息"></td>`);
  return `<section class="panel"><div class="toolbar"><h3>站内消息</h3><div class="actions">${button('批量标为已读','message-mark-selected')}${button('批量删除','message-delete-selected')}${['ADMIN','DORM_MANAGER'].includes(role())?button('发布消息','publish-message'):''}</div></div>${sourceTabs}<form id="message-filter-form" class="filter-grid">${showRead?select('read','阅读状态',[['unread','未读'],['read','已读'],['','全部']],f.read,false,false):''}${admin&&f.sender==='DORM_MANAGER'?field('publisher','宿管姓名','search',f.publisher||'',false):''}${role()==='REPAIRER'?select('building','楼栋',[['','全部楼栋'],...buildings.map(b=>[b.building_id,b.building_name])],f.building||'',false,false):''}${field('from','开始日期','date',f.from||'',false)}${field('to','结束日期','date',f.to||'',false)}${admin?select('building','楼栋',[['','全部楼栋'],...buildings.map(b=>[b.building_id,b.building_name])],f.building||'',false,false):''}<div class="filter-actions"><button class="primary">查询</button><button type="reset" class="secondary" data-filter-clear="message-filter-form">清空</button></div></form>${messageTable}</section>`;
 }
};
function alignTableOperations(root=document){
 if(window.innerWidth<=850){
  root.querySelectorAll('.table-component').forEach(component=>{
   const table=component.querySelector('.table');
   if(!table)return;
   for(const cell of table.querySelectorAll('th,tbody td'))for(const property of ['width','min-width','padding-left','padding-right','text-align'])cell.style.removeProperty(property);
   for(const group of table.querySelectorAll('tbody td:last-child > .actions')){
    for(const property of ['display','flex-flow','justify-content','width','max-width','margin-left'])group.style.removeProperty(property);
    for(const button of group.querySelectorAll('button'))for(const property of ['flex','min-width','white-space'])button.style.removeProperty(property);
   }
  });
  return;
 }
 root.querySelectorAll('.table-component').forEach(component=>{
  const table=component.querySelector('.table');
  if(!table)return;
  const headerRow=table.tHead?.rows[0];
  const heading=headerRow?.cells[headerRow.cells.length-1];
  const cells=[...table.querySelectorAll('tbody tr > td:last-child')];
  const groups=cells.map(cell=>cell.querySelector(':scope > .actions')).filter(Boolean);
  if(!heading||!groups.length)return;
  const headerCells=[...headerRow.cells];
  const initialWidths=headerCells.map(cell=>cell.getBoundingClientRect().width);
  const tableWidth=table.getBoundingClientRect().width;
  for(const group of groups){
   group.style.setProperty('display','flex','important');
   group.style.setProperty('flex-flow','row nowrap','important');
   group.style.setProperty('justify-content','flex-start','important');
   group.style.setProperty('width','max-content','important');
   group.style.setProperty('max-width','none','important');
   group.style.setProperty('margin-left','auto','important');
   for(const button of group.querySelectorAll('button')){
    button.style.setProperty('flex','0 0 auto','important');
    button.style.setProperty('min-width','max-content','important');
    button.style.setProperty('white-space','nowrap','important');
   }
  }
  const width=Math.ceil(Math.max(...groups.map(group=>group.getBoundingClientRect().width)));
  const operationColumnWidth=width+16;
  const repairerSelection=component.classList.contains('repair-orders-repairer')?headerCells.findIndex(cell=>cell.classList.contains('select-col')):-1;
  const selectionColumnWidth=repairerSelection>=0?36:0;
  const availableWidth=Math.max(0,tableWidth-operationColumnWidth-selectionColumnWidth);
  const otherColumnWidthTotal=initialWidths.reduce((total,value,index)=>index===headerCells.length-1||index===repairerSelection?total:total+value,0);
  headerCells.forEach((cell,index)=>{
   const nextWidth=index===headerCells.length-1?operationColumnWidth:index===repairerSelection?selectionColumnWidth:availableWidth*initialWidths[index]/otherColumnWidthTotal;
   cell.style.setProperty('width',`${nextWidth}px`,'important');
   if(index===headerCells.length-1){cell.style.setProperty('padding-left','8px','important');cell.style.setProperty('padding-right','8px','important');}
   for(const row of table.tBodies[0]?.rows||[])row.cells[index]?.style.setProperty('width',`${nextWidth}px`,'important');
   if(index===headerCells.length-1)for(const row of table.tBodies[0]?.rows||[]){row.cells[index]?.style.setProperty('padding-left','8px','important');row.cells[index]?.style.setProperty('padding-right','8px','important');}
  });
  heading.style.setProperty('text-align','left','important');
  for(const cell of cells){
   cell.style.setProperty('text-align','left','important');
  }
  for(const group of groups)group.style.setProperty('width',`${width}px`,'important');
 });
}
let renderId=0;
export async function render(){
 if(!state.token||!state.user){login();return;}
 if(role()==='STUDENT'&&state.page==='dashboard')state.page='repairs';
 const scrollPosition=window.scrollY;
 disposeDashboardCharts();
 const current=++renderId;
 tableSequence=0;
 layout('<div class="empty">正在加载...</div>');
 try{
  const html=await pages[state.page]();
  state.data.unreadCount=(await api('/messages/unread-count')).count;
  if(current!==renderId||!state.token)return;
  layout(html);
  document.querySelectorAll('.bulk-table tbody tr,.message-table tbody tr').forEach(row=>{const checkbox=row.querySelector(':scope > td.select-col');if(checkbox)row.prepend(checkbox);});
  alignTableOperations();
  window.onresize=()=>alignTableOperations();
  window.scrollTo({top:scrollPosition,left:0,behavior:'auto'});
  if(state.page==='dashboard'&&['ADMIN','DORM_MANAGER'].includes(role()))mountDashboardCharts(state.data.dashboard);
  if(state.page==='dashboard'&&role()==='REPAIRER')mountRepairerDashboardCharts(state.data.repairerDashboardStats);
  bindTablePagination(document);
  document.querySelectorAll('[data-action]').forEach(b=>b.onclick=async()=>{
   b.disabled=true;
   try{
    const a=b.dataset.action,id=b.dataset.id;
    if(a==='read-message'){await post(`/messages/${id}/read`);await render();}
    else if(a==='repair-history-back'){state.page='repairs';await render();}
    else if(a==='stay-history-open'){state.data.stayHistoryReturn=state.page;state.page='stayHistory';await render();}
    else if(a==='message-mark-selected'){const ids=[...document.querySelectorAll('.message-table [data-message-select-row]:checked')].map(input=>Number(input.value));if(!ids.length)throw new Error('请先勾选要标为已读的消息');await post('/messages/read',{ids});await render();notify(`已将 ${ids.length} 条消息标为已读`);}
    else if(a==='message-delete-selected'){const ids=[...document.querySelectorAll('.message-table [data-message-select-row]:checked')].map(input=>Number(input.value));if(!ids.length)throw new Error('请先勾选要删除的消息');modal('批量删除消息',`将选中的 ${ids.length} 条消息从当前账号的消息列表移除。`,async()=>{const result=await api('/messages',{method:'DELETE',body:JSON.stringify({ids})});return `已删除 ${result.deletedCount} 条消息`;},'确认删除');}
    else if(a==='message-delete'){modal('删除消息','将此消息从当前账号的消息列表移除。',async()=>{await api(`/messages/${id}`,{method:'DELETE'});return '消息已删除';},'确认删除');}
    else if(a==='message-withdraw'){modal('撤回消息','撤回后，所有接收人的消息中心都不再显示此消息。',async()=>{await post(`/messages/${id}/withdraw`);return '消息已撤回';},'确认撤回');}
    else if(a==='message-source'){state.data.messageFilters={...(state.data.messageFilters||{}),sender:id};await render();}
    else if(a==='message-read-filter'){state.data.messageFilters={...(state.data.messageFilters||{}),read:id};await render();}
    else if(a==='message-detail'){
     let row=state.data.messageRowsById?.[id];if(!row)throw new Error('消息不存在');
     if(row.is_recipient&&!row.read_at&&(role()!=='ADMIN'||row.source_label==='系统通知')){await post(`/messages/${id}/read`);await render();row=state.data.messageRowsById?.[id]||{...row,read_at:new Date().toISOString(),read_label:'已读'};}
     const attachments=(row.attachments||[]).map(file=>button('预览 '+esc(file.original_name),'preview-message-file',file.file_id,`data-name="${esc(file.original_name)}" data-type="${esc(file.content_type)}"`)+button('下载','download-message-file',file.file_id,`data-name="${esc(file.original_name)}"`)).join('');
     const detail=modal('消息详情',`<dl class="detail-grid">${[['标题',row.title],['通知来源',row.source_label],['发布人',row.publisher_name],['楼栋',row.building_names],['接收角色',row.recipient_roles],['发布时间',row.created_at],['阅读状态',row.read_label]].map(([label,value])=>`<div><dt>${label}</dt><dd>${esc(value||'-')}</dd></div>`).join('')}</dl><section class="message-detail-content"><h3>消息内容</h3><p>${esc(row.content||'')}</p></section><div class="actions message-detail-attachments">${attachments||'<span class="muted">无附件</span>'}</div>`,null);
     detail.querySelectorAll('[data-action="preview-message-file"],[data-action="download-message-file"]').forEach(fileButton=>fileButton.onclick=async()=>{
      const response=await fetch(`${API}/files/${fileButton.dataset.id}`,{headers:{Authorization:`Bearer ${state.token}`}});if(!response.ok){notify('附件读取失败',true);return;}
      const blob=await response.blob(),url=URL.createObjectURL(blob),name=fileButton.dataset.name||'附件';
      if(fileButton.dataset.action==='download-message-file'){const link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);return;}
      const type=fileButton.dataset.type||blob.type,content=type.startsWith('image/')?`<img class="attachment-preview-image" src="${url}" alt="${esc(name)}">`:type==='application/pdf'||type.startsWith('text/')?`<iframe class="attachment-preview-frame" src="${url}" title="${esc(name)}"></iframe>`:`<p>此文件类型无法在浏览器内直接预览，请下载查看。</p><a class="secondary attachment-download-link" href="${url}" download="${esc(name)}">下载 ${esc(name)}</a>`;
      const preview=modal(`附件预览：${name}`,content,null,'保存',true);preview.addEventListener('close',()=>URL.revokeObjectURL(url),{once:true});
     });
    }
    else if(a==='download-message-file'){const response=await fetch(`${API}/files/${id}`,{headers:{Authorization:`Bearer ${state.token}`}});if(!response.ok)throw new Error('附件下载失败');const url=URL.createObjectURL(await response.blob());const link=document.createElement('a');link.href=url;link.download=b.dataset.name||'附件';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
    else if(a==='preview-message-file'){const response=await fetch(`${API}/files/${id}`,{headers:{Authorization:`Bearer ${state.token}`}});if(!response.ok)throw new Error('附件预览失败');const blob=await response.blob(),url=URL.createObjectURL(blob),name=b.dataset.name||'附件',type=b.dataset.type||blob.type;const content=type.startsWith('image/')?`<img class="attachment-preview-image" src="${url}" alt="${esc(name)}">`:type==='application/pdf'||type.startsWith('text/')?`<iframe class="attachment-preview-frame" src="${url}" title="${esc(name)}"></iframe>`:`<p>此文件类型无法在浏览器内直接预览，请下载查看。</p><a class="secondary attachment-download-link" href="${url}" download="${esc(name)}">下载 ${esc(name)}</a>`;const dialog=modal(`附件预览：${name}`,content,null,'保存',true);dialog.addEventListener('close',()=>URL.revokeObjectURL(url),{once:true});}
    else if(a==='log-detail'){const logs=await api('/admin/operation-logs');const row=logs.find(x=>String(x.log_id)===id);modal('操作日志详情',`<dl class="detail-grid">${[['操作人',row?.real_name],['操作角色',row?.role_label],['模块',row?.module_label],['动作',row?.action],['业务编号',row?.business_id],['结果',row?.result],['时间',row?.occurred_at]].map(([k,v])=>`<div><dt>${k}</dt><dd>${esc(v??'-')}</dd></div>`).join('')}</dl>`,null);}
    else if(a==='profile-edit'){const p=state.data.profile,gender=select('gender','性别',[['','未填写'],['MALE','男'],['FEMALE','女']],p.gender||'',false,false);const html=field('realName','姓名','text',p.real_name||'')+gender+field('birthDate','生日','date',p.birth_date||'',false)+field('phone','联系电话','tel',p.phone||'',false,contactAttrs)+(role()==='ADMIN'?field('hireDate','入职时间','date',p.hire_date||'',false):'');modal('编辑个人资料',html,async d=>{const updated=await put('/profile',d);state.user.name=updated.real_name;sessionStorage.setItem('dorm_user',JSON.stringify(state.user));return '个人资料已更新';});}
    else if(a==='password')modal('修改密码',field('oldPassword','原密码','password')+field('newPassword','新密码','password'),d=>put('/profile/password',d));
    else if(a==='publish-message'){
     const buildings=await api('/buildings');
     const admin=role()==='ADMIN';
     const buildingChecks=checkboxChoices('buildingIds',buildings.map(x=>[x.building_id,x.building_name]),buildings.map(x=>x.building_id),'楼栋范围（默认全部楼栋）');
     const recipientPicker=admin?select('targetRole','接收角色',[['ALL','全部角色'],['STUDENT','学生'],['DORM_MANAGER','宿管'],['REPAIRER','维修人员']],'ALL'):select('targetRole','接收对象',[['STUDENT','负责楼栋学生'],['ALL','负责楼栋全部角色']],'STUDENT');
     const dialog=modal('发布消息',field('title','标题')+field('content','内容','textarea')+buildingChecks+
      recipientPicker+
      field('publishAt','发布时间','datetime-local','',false)+`<label class="field"><span>附件（单个不超过5MB）</span><input type="file" name="messageFiles" multiple></label>`,async(d,form)=>{const attachmentIds=[];for(const selectedFile of form.elements.messageFiles.files){const file=await normalizeImageUpload(selectedFile);const body=new FormData();body.set('file',file);attachmentIds.push((await api('/messages/files',{method:'POST',body})).fileId);}const selected=[...form.querySelectorAll('[name="buildingIds"]:checked')].map(x=>Number(x.value));if(!selected.length)throw new Error('至少选择一个楼栋');await post('/messages',{...d,buildingIds:selected,attachmentIds});state.data.messageFilters={...(state.data.messageFilters||{}),sender:'MINE'};return '通知已发布';});
      bindChoiceDropdown(dialog);
    }else if(a.startsWith('repair-'))await repairAction(a,id,b);
    else if(a.startsWith('stay-'))await stayAction(a,id,b);
    else await adminAction(a,id,b);
   }catch(e){notify(e.message,true);}finally{b.disabled=false;}
  });
  const roleTable=document.querySelector('.role-table');
  if(roleTable){
   roleTable.addEventListener('change',event=>{
    const rows=[...roleTable.querySelectorAll('[data-select-row]')],all=roleTable.querySelector('[data-select-all]');
    if(event.target.matches('[data-select-all]'))rows.filter(input=>!input.closest('tr').hidden).forEach(input=>input.checked=event.target.checked);
    if(all){const visible=rows.filter(input=>!input.closest('tr').hidden),count=visible.filter(input=>input.checked).length;all.checked=visible.length>0&&count===visible.length;all.indeterminate=count>0&&count<visible.length;}
   });
  }
   document.querySelectorAll('.resource-table').forEach(resourceTable=>resourceTable.addEventListener('change',event=>{
   const rows=[...resourceTable.querySelectorAll('[data-resource-select-row]')],all=resourceTable.querySelector('[data-resource-select-all]');
   if(event.target.matches('[data-resource-select-all]'))rows.filter(input=>!input.closest('tr').hidden).forEach(input=>input.checked=event.target.checked);
   if(all){const visible=rows.filter(input=>!input.closest('tr').hidden),count=visible.filter(input=>input.checked).length;all.checked=visible.length>0&&count===visible.length;all.indeterminate=count>0&&count<visible.length;}
  }));
  document.querySelectorAll('.bulk-table').forEach(bulkTable=>{
   const type=bulkTable.dataset.bulkType;state.data.bulkSelections??={};state.data.bulkSelections[type]??=[];
   bulkTable.querySelectorAll('[data-bulk-select-row]').forEach(input=>input.checked=state.data.bulkSelections[type].includes(input.value));
   bulkTable.addEventListener('change',event=>{
    const rows=[...bulkTable.querySelectorAll('[data-bulk-select-row]')],all=bulkTable.querySelector('[data-bulk-select-all]');
    if(event.target.matches('[data-bulk-select-all]'))rows.filter(input=>!input.closest('tr').hidden).forEach(input=>input.checked=event.target.checked);
    state.data.bulkSelections[type]=rows.filter(input=>input.checked).map(input=>input.value);
    if(all){const visible=rows.filter(input=>!input.closest('tr').hidden),count=visible.filter(input=>input.checked).length;all.checked=visible.length>0&&count===visible.length;all.indeterminate=count>0&&count<visible.length;}
   });
  });
   document.querySelectorAll('.message-table').forEach(messageTable=>messageTable.addEventListener('change',event=>{
    const rows=[...messageTable.querySelectorAll('[data-message-select-row]')],all=messageTable.querySelector('[data-message-select-all]');
    if(event.target.matches('[data-message-select-all]'))rows.filter(input=>!input.closest('tr').hidden).forEach(input=>input.checked=event.target.checked);
    if(all){const visible=rows.filter(input=>!input.closest('tr').hidden),count=visible.filter(input=>input.checked).length;all.checked=visible.length>0&&count===visible.length;all.indeterminate=count>0&&count<visible.length;}
   }));
  document.querySelectorAll('[data-resource-filter]').forEach(form=>{
   form.onsubmit=event=>{
    event.preventDefault();const filters=Object.fromEntries(new FormData(form));
    for(const [key,value] of Object.entries(filters))if(value==='')delete filters[key];
    state.data.resourceFilters??={};state.data.resourceFilters[form.dataset.resourceFilter]=filters;render();
   };
   form.addEventListener('change',event=>{if(['buildingId','floorNo','roomId'].includes(event.target.name))cascadeResourceFilters(form,event.target.name);});
  });
  const userFilter=document.querySelector('#user-filter-form');
  if(userFilter){
   userFilter.onsubmit=event=>{event.preventDefault();const filters=Object.fromEntries(new FormData(userFilter));for(const [key,value] of Object.entries(filters))if(!value)delete filters[key];state.data.userFilters??={};state.data.userFilters[state.page]=filters;render();};
    userFilter.addEventListener('change',event=>{if(event.target.matches('[data-directory-filter]'))cascadeDirectoryFilters(userFilter,event.target.name);});
  }
  const accommodationFilter=document.querySelector('#accommodation-filter-form');
  if(accommodationFilter){
   accommodationFilter.onsubmit=event=>{event.preventDefault();const filters=Object.fromEntries(new FormData(accommodationFilter));for(const [key,value] of Object.entries(filters))if(!value)delete filters[key];state.data.homeFilters=filters;render();};
   accommodationFilter.addEventListener('change',event=>{if(['buildingId','departmentId','majorId','grade'].includes(event.target.name))cascadeAccommodationFilters(accommodationFilter,event.target.name);});
  }
  const accommodationHistoryFilter=document.querySelector('#accommodation-history-filter-form');
  if(accommodationHistoryFilter){
   accommodationHistoryFilter.onsubmit=event=>{event.preventDefault();const filters=Object.fromEntries(new FormData(accommodationHistoryFilter));for(const [key,value] of Object.entries(filters))if(!value)delete filters[key];state.data.accommodationHistoryFilters??={};state.data.accommodationHistoryFilters[state.page]=filters;render();};
   accommodationHistoryFilter.addEventListener('change',event=>{if(event.target.matches('[data-history-filter]'))cascadeAccommodationHistoryFilters(accommodationHistoryFilter,event.target.name);});
  }
  const stayHistoryFilter=document.querySelector('#stay-history-filter-form');
  if(stayHistoryFilter){
   stayHistoryFilter.onsubmit=event=>{event.preventDefault();const filters=Object.fromEntries(new FormData(stayHistoryFilter));for(const [key,value] of Object.entries(filters))if(!value)delete filters[key];state.data.stayHistoryFilters=filters;render();};
  }
  const stayManagerFilter=document.querySelector('#stay-manager-filter-form');
  if(stayManagerFilter){
   const saveBatch=value=>{const [batchId,buildingId]=String(value||'').split(':');state.data.selectedStayBatchId=batchId||'';state.data.selectedStayBuildingId=buildingId||'';};
   stayManagerFilter.onsubmit=event=>{event.preventDefault();const filters=Object.fromEntries(new FormData(stayManagerFilter));saveBatch(filters.batchId);delete filters.batchId;for(const [key,value] of Object.entries(filters))if(!value)delete filters[key];state.data.stayManagerFilters={...filters,status:state.data.stayManagerFilters?.status||''};render();};
   stayManagerFilter.querySelector('[data-filter-clear="stay-manager-filter-form"]')?.addEventListener('click',event=>{event.preventDefault();const status=state.data.stayManagerFilters?.status||'';saveBatch(stayManagerFilter.elements.batchId?.value);state.data.stayManagerFilters={status};render();});
   stayManagerFilter.elements.batchId?.addEventListener('change',event=>{saveBatch(event.target.value);render();});
  }
  document.querySelectorAll('.stay-manager-deadline-form').forEach(stayDeadlineForm=>stayDeadlineForm.onsubmit=async event=>{event.preventDefault();const form=new FormData(stayDeadlineForm),batchId=stayDeadlineForm.dataset.batchId,buildingId=stayDeadlineForm.dataset.buildingId;await put(`/stay/batches/${batchId}/building-rule`,{buildingId:Number(buildingId),applicationDeadline:String(form.get('applicationDeadline')).replace('T',' '),autoLock:form.get('autoLock')==='on'});await render();notify('本楼申请截止时间和自动锁定设置已保存');});
  const studentStayFilter=document.querySelector('#stay-student-filter-form');if(studentStayFilter){studentStayFilter.onsubmit=event=>{event.preventDefault();const filters=Object.fromEntries(new FormData(studentStayFilter));for(const[key,value]of Object.entries(filters))if(!value)delete filters[key];state.data.stayStudentFilters=filters;render();};studentStayFilter.querySelector('[data-filter-clear]')?.addEventListener('click',event=>{event.preventDefault();delete state.data.stayStudentFilters;render();});}
  const repairerRecordFilter=document.querySelector('#repairer-record-filter-form');if(repairerRecordFilter){repairerRecordFilter.onsubmit=event=>{event.preventDefault();const filters=Object.fromEntries(new FormData(repairerRecordFilter));for(const[key,value]of Object.entries(filters))if(!value)delete filters[key];state.data.repairerRecordFilters??={};state.data.repairerRecordFilters[state.page]=filters;render();};repairerRecordFilter.querySelector('[data-filter-clear="repairer-record-filter-form"]')?.addEventListener('click',event=>{event.preventDefault();state.data.repairerRecordFilters??={};delete state.data.repairerRecordFilters[state.page];render();});}
  for(const [formId,key] of [['repair-filter-form','repairFilters'],['repair-history-filter-form','repairHistoryFilters'],['log-filter-form','logFilters'],['message-filter-form','messageFilters']]){
   const form=document.getElementById(formId);if(!form)continue;
   form.onsubmit=event=>{event.preventDefault();const filters=Object.fromEntries(new FormData(form));if(formId==='message-filter-form')filters.sender=state.data.messageFilters?.sender||'SYSTEM';if(formId==='repair-filter-form'&&state.data.repairFilters?.status)filters.status=state.data.repairFilters.status;for(const [name,value] of Object.entries(filters))if(!value&&!(formId==='message-filter-form'&&name==='read'))delete filters[name];state.data[key]=filters;render();};
   form.querySelector(`[data-filter-clear="${formId}"]`)?.addEventListener('click',event=>{event.preventDefault();state.data[key]=formId==='message-filter-form'?{read:'unread',sender:state.data.messageFilters?.sender||'SYSTEM'}:{};render();});
   if(formId.startsWith('repair-'))form.addEventListener('change',event=>{if(event.target.name==='building')cascadeRepairFilters(form);});
  }
  for(const [name,key] of [['stayPeriod','stayPeriod'],['stayBatch','stayBatch'],['stayBuilding','stayBuilding'],['ratingPeriod','ratingPeriod']])document.querySelector(`[name="${name}"]`)?.addEventListener('change',event=>{state.data[key]=event.target.value;render();});
  for(const [name,key] of [['repairerEventYear','repairerEventYear'],['repairerEventMonth','repairerEventMonth'],['repairerRatingYear','repairerRatingYear'],['repairerRatingMonth','repairerRatingMonth']])document.querySelector(`[name="${name}"]`)?.addEventListener('change',event=>{state.data[key]=event.target.value;if(name.endsWith('Year')&&!event.target.value)state.data[key.replace('Year','Month')]='';render();});
  const ratingDialog=document.querySelector('#repair-rating');if(ratingDialog)bindChoiceDropdown(ratingDialog);
  const approvedFilter=document.querySelector('#stay-approved-filter-form');if(approvedFilter){approvedFilter.elements.batchId?.addEventListener('change',event=>{state.data.selectedStayBatchId=event.target.value;const filters=Object.fromEntries(new FormData(approvedFilter));delete filters.batchId;state.data.stayApprovedFilters=filters;render();});approvedFilter.onsubmit=event=>{event.preventDefault();const filters=Object.fromEntries(new FormData(approvedFilter));state.data.selectedStayBatchId=filters.batchId;delete filters.batchId;for(const [key,value] of Object.entries(filters))if(!value)delete filters[key];state.data.stayApprovedFilters=filters;render();};approvedFilter.querySelector('[data-filter-clear="stay-approved-filter-form"]')?.addEventListener('click',event=>{event.preventDefault();state.data.stayApprovedFilters={};render();});}
  const search=document.querySelector('#list-search');
  if(search)search.oninput=()=>role()==='ADMIN'?filterTableComponents(search.value.trim()):document.querySelectorAll('tbody tr').forEach(row=>row.hidden=!row.textContent.toLowerCase().includes(search.value.toLowerCase()));
 }catch(e){
  if(!state.token||current!==renderId)return;
  layout(`<section class="panel"><p class="error">${esc(e.message)}</p><button class="secondary" id="retry">重新加载</button></section>`);
  document.querySelector('#retry').onclick=render;
 }
}
function disposeDashboardCharts(){for(const chart of dashboardCharts)chart.dispose();dashboardCharts.length=0;}
function mountDashboardCharts(data){
 if(!window.echarts||!data)return;
 const palette=['#168a83','#e39a3b','#4386b8','#cf685d','#748a4c','#8e74a8'];
 const labels={DRAFT:'草稿',PENDING_REVIEW:'待审核',PENDING_EDIT:'待修改',UNDER_REVIEW:'审核中',PENDING_ASSIGN:'待派单',PENDING_MANUAL:'待人工处理',PENDING_ACCEPT:'待接单',ACCEPTED:'已接单',DELAYED:'延期中',IN_REPAIR:'维修中',REPAIRED:'已维修',PENDING_CONFIRM:'待确认',CONFIRMED:'已确认',COMPLETED:'已完成',ARCHIVED:'已归档',CANCELLED:'已撤销',CLOSED:'已关闭',APPROVED:'已通过'};
 const make=(id,rows,xName,yName,unit)=>{const node=document.getElementById(id);if(!node)return;const chart=window.echarts.init(node),items=(rows||[]).map(row=>({name:labels[row.status]||row.status,value:Number(row.total)}));chart.setOption({color:palette,tooltip:{trigger:'axis',axisPointer:{type:'shadow'},formatter:items=>`${items[0]?.name||''}<br/>${items[0]?.value||0} ${unit}`},grid:{left:64,right:22,top:20,bottom:76,containLabel:true},xAxis:{type:'category',name:xName,nameLocation:'middle',nameGap:42,data:items.map(item=>item.name),axisLabel:{interval:0,rotate:items.length>5?22:0,margin:12},axisTick:{alignWithLabel:true}},yAxis:{type:'value',name:yName,nameLocation:'middle',nameGap:44,nameRotate:90,minInterval:1},series:[{type:'bar',data:items.map(item=>item.value),barMaxWidth:38,label:{show:true,position:'top'},itemStyle:{borderRadius:[4,4,0,0]}}]});dashboardCharts.push(chart);};
 make('stay-status-chart',data.stayStatus,'申请状态','申请数量（份）','份');make('repair-status-chart',data.repairStatus,'工单状态','工单数量（张）','张');
 const housing=document.getElementById('accommodation-status-chart');if(housing){const chart=window.echarts.init(housing),manager=state.user?.role==='DORM_MANAGER';chart.setOption({color:['#168a83','#e39a3b'],tooltip:{trigger:'item',formatter:manager?'{b}<br/>{c} 张床位 ({d}%)':'{b}<br/>{c} 人 ({d}%)'},series:[{type:'pie',radius:['54%','78%'],center:['50%','50%'],itemStyle:{borderColor:'#fff',borderWidth:3,borderRadius:4},label:{show:true,formatter:'{b} {d}%',color:'#27363d'},data:manager?[{name:'已占床位',value:Number(data.accommodationStats.occupiedBeds)},{name:'空闲床位',value:Number(data.accommodationStats.availableBeds)}]:[{name:'已住宿',value:Number(data.accommodationStats.housed)},{name:'未住宿',value:Number(data.accommodationStats.unhoused)}]}]});dashboardCharts.push(chart);}
 const monthly=(id,rows,xName,yName,unit)=>{const node=document.getElementById(id);if(!node)return;const chart=window.echarts.init(node);chart.setOption({color:['#168a83'],tooltip:{trigger:'axis',formatter:items=>`${items[0]?.name||''}<br/>${items[0]?.value||0} ${unit}`},grid:{left:64,right:22,top:18,bottom:54,containLabel:true},xAxis:{type:'category',name:xName,nameLocation:'middle',nameGap:30,data:(rows||[]).map(x=>`${x.month}月`)},yAxis:{type:'value',name:yName,nameLocation:'middle',nameGap:44,nameRotate:90,minInterval:1},series:[{type:'bar',data:(rows||[]).map(x=>Number(x.total)),barMaxWidth:34,label:{show:true,position:'top'}}]});dashboardCharts.push(chart);};
 monthly('stay-monthly-chart',data.stayMonthly,'申请创建月份','申请数量（份）','份');monthly('repair-monthly-chart',data.repairMonthly,'工单创建月份','工单数量（张）','张');
 const stayNode=document.getElementById('stay-analysis-chart');if(stayNode){const chart=window.echarts.init(stayNode),rows=state.data.stayAnalysis?.rows||[],labels=[...new Set(rows.map(x=>x.label))],groups=[...new Set(rows.map(x=>x.series))];chart.setOption({color:palette,tooltip:{trigger:'axis'},legend:{type:'scroll',bottom:0,left:'center'},grid:{left:48,right:22,top:24,bottom:groups.length>1?76:48,containLabel:true},xAxis:{type:'category',data:labels,axisLabel:{interval:0,rotate:labels.length>7?25:0,margin:15},axisTick:{show:true,alignWithLabel:true,length:7,lineStyle:{color:'#75838c',width:1}},axisLine:{lineStyle:{color:'#75838c',width:1}},splitLine:{show:true,lineStyle:{color:'#d7dfe4',type:'dashed',width:1}}},yAxis:{type:'value',minInterval:1},series:groups.map(name=>({name,type:'bar',barMaxWidth:38,data:labels.map(label=>Number(rows.find(x=>x.series===name&&x.label===label)?.total||0)),itemStyle:{borderRadius:[4,4,0,0]}}))});dashboardCharts.push(chart);}
 const ratingNode=document.getElementById('repair-rating-chart');if(ratingNode){const chart=window.echarts.init(ratingNode),analysis=state.data.repairEvaluationAnalysis||{},period=state.data.ratingPeriod||'year1',rows=period==='year1'?analysis.monthly||[]:analysis.annual||[],categories=period==='year1'?rows.map(row=>`${row.month}月`):rows.map(row=>`${row.year}年`);chart.setOption({color:['#e39a3b','#4386b8'],tooltip:{trigger:'axis'},legend:{top:0},grid:{left:48,right:48,top:36,bottom:period==='year1'?38:70,containLabel:true},xAxis:{type:'category',data:categories,axisLabel:{interval:0,rotate:categories.length>8?25:0}},yAxis:[{type:'value',min:0,max:5,name:'评分'},{type:'value',minInterval:1,name:'评价数'}],series:[{name:'综合评分',type:'bar',data:rows.map(row=>Number(row.averageScore)),barMaxWidth:34,label:{show:true,position:'top',formatter:'{c} 分'}},{name:'评价数量',type:'line',yAxisIndex:1,data:rows.map(row=>Number(row.total)),smooth:true}]});dashboardCharts.push(chart);}
}
function mountRepairerDashboardCharts(stats){
 if(!window.echarts||!stats)return;
 const palette=['#168a83','#e39a3b','#4386b8','#cf685d','#748a4c'];
 const make=(id,option)=>{const node=document.getElementById(id);if(!node)return;const chart=window.echarts.init(node);chart.setOption(option);dashboardCharts.push(chart);};
 const counts=stats.recordCounts||{};
 const records=[['拒单',counts.rejected],['接单超时',counts.acceptTimeout],['维修超时',counts.repairTimeout],['延期申请',counts.delays],['重修工单',counts.reworks]];
 make('repairer-record-chart',{color:palette,tooltip:{trigger:'axis',formatter:items=>`${items[0]?.name||''}<br/>${items[0]?.value||0} 次`},grid:{left:38,right:18,top:22,bottom:54,containLabel:true},xAxis:{type:'category',data:records.map(row=>row[0]),axisLabel:{interval:0}},yAxis:{type:'value',minInterval:1},series:[{type:'bar',data:records.map(row=>Number(row[1]||0)),barMaxWidth:42,label:{show:true,position:'top'},itemStyle:{borderRadius:[4,4,0,0]}}]});
 const ratings=stats.ratingTrend||[];
 make('repairer-evaluation-chart',{color:['#e39a3b'],tooltip:{trigger:'axis',confine:true,position:(point,params,dom,rect,size)=>({left:Math.max(8,size.viewSize[0]-size.contentSize[0]-10),top:8}),formatter:items=>`${items[0]?.name||''}<br/>综合评分：${Number(items[0]?.value||0).toFixed(2)} / 5`},grid:{left:82,right:22,top:24,bottom:52,containLabel:true},xAxis:{type:'category',data:ratings.map(row=>row.label),axisLabel:{interval:0,rotate:ratings.length>8?24:0}},yAxis:{type:'value',min:0,max:5,interval:1,name:'综合评分',nameLocation:'middle',nameGap:48,nameRotate:90},series:[{name:'综合评分',type:'bar',data:ratings.map(row=>Number(row.averageScore||0)),barMaxWidth:36,label:{show:true,position:'top',formatter:'{c} 分'},itemStyle:{borderRadius:[4,4,0,0]}}]});
}
window.addEventListener('resize',()=>dashboardCharts.forEach(chart=>chart.resize()));
render();
