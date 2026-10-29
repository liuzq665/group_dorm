import { repairPage, repairAction } from './repairs.js';
import { stayPage, stayAction } from './stay.js';
import { adminPages, adminAction, cascadeDirectoryFilters } from './management.js';

export const API = '/api/v1';
const roles = { STUDENT:'学生端', DORM_MANAGER:'宿管端', REPAIRER:'维修人员端', ADMIN:'系统管理员端' };
export const statuses = { DRAFT:'草稿', PENDING_REVIEW:'待审核', PENDING_EDIT:'待修改', UNDER_REVIEW:'审核中', PENDING_ASSIGN:'待派单', PENDING_ACCEPT:'待接单', ACCEPTED:'已接单', DELAYED:'维修延期', REPAIRED:'已维修', CONFIRMED:'已确认', ARCHIVED:'已归档', PENDING_MANUAL:'待人工处理', APPROVED:'已通过', COMPLETED:'已完成', CANCELLED:'已撤销', CLOSED:'已关闭', REJECTED:'已拒单', TIMEOUT:'接单超时', REPAIR_TIMEOUT:'维修超时', RETURNED:'退回修改', PENDING:'待处理' };
export const state = { token:sessionStorage.getItem('dorm_token'), user:JSON.parse(sessionStorage.getItem('dorm_user') || 'null'), page:'dashboard', data:{} };
export const role = () => state.user?.role;
export const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const status = value => `<span class="status ${esc(value)}">${esc(statuses[value] || value || '-')}</span>`;
export const button = (label, action, id='', extra='') => `<button type="button" class="secondary" data-action="${action}" data-id="${esc(id)}" ${extra}>${label}</button>`;
export const post = (path, data={}) => api(path, {method:'POST',body:JSON.stringify(data)});
export const put = (path, data) => api(path, {method:'PUT',body:JSON.stringify(data)});
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
function clearSession(){state.token=null;state.user=null;sessionStorage.removeItem('dorm_token');sessionStorage.removeItem('dorm_user');}
export function notify(message,error=false){let node=document.querySelector('#toast');if(!node)return;node.textContent=message;node.className=error?'toast error-toast':'toast';node.hidden=false;setTimeout(()=>node.hidden=true,4000);}
export function field(name,label,type='text',value='',required=true){return `<label class="field"><span>${label}</span>${type==='textarea'?`<textarea name="${name}" ${required?'required':''}>${esc(value)}</textarea>`:`<input name="${name}" type="${type}" value="${esc(value)}" ${required?'required':''}>`}</label>`;}
export function select(name,label,items,value='',multiple=false,required=true){return `<label class="field"><span>${label}</span><select name="${name}" aria-label="${esc(label)}" ${multiple?'multiple':required?'required':''}>${items.map(([id,text])=>`<option value="${esc(id)}" ${(multiple?Array.from(value||[]).map(String).includes(String(id)):String(id)===String(value))?'selected':''}>${esc(text)}</option>`).join('')}</select></label>`;}
export function check(name,label,checked=false){return `<label class="check"><input type="checkbox" name="${name}" ${checked?'checked':''}> ${label}</label>`;}
export function table(rows,columns,actions=()=>'',idKey='id'){
  if(!rows.length)return '<div class="empty">暂无记录</div>';
  return `<div class="table-wrap"><table class="table"><thead><tr>${columns.map(([,label])=>`<th>${label}</th>`).join('')}<th>操作</th></tr></thead><tbody>${rows.map(row=>`<tr data-row-id="${esc(row[idKey])}">${columns.map(([key])=>{const value=row[key],cell=key==='current_status'?status(value):key==='enabled'?(Number(value)===1?'启用':'停用'):["on_duty","manager_on_duty"].includes(key)?(Number(value)===1?'在岗':'离岗'):key==='gender'?({MALE:'男',FEMALE:'女',OTHER:'其他'}[value]||'未填写'):key==='enrollment_status'?({ENROLLED:'在读',SUSPENDED:'休学',GRADUATED:'毕业',WITHDRAWN:'退学',UNKNOWN:'未登记'}[value]||'-'):esc(value??'-');return `<td>${cell}</td>`;}).join('')}<td><div class="actions">${actions(row)||'-'}</div></td></tr>`).join('')}</tbody></table></div>`;
}
export function modal(title,html,onSubmit,submitLabel='保存'){
  document.querySelector('dialog')?.remove();
  const dialog=document.createElement('dialog');dialog.className='dialog';
  dialog.innerHTML=`<form id="dialog-form"><header class="dialog-header"><h2>${esc(title)}</h2><button type="button" class="icon-button" title="关闭" aria-label="关闭">&times;</button></header><div class="dialog-body">${html}</div><p class="error" role="alert"></p><footer class="dialog-footer">${onSubmit?`<button class="primary" type="submit">${submitLabel}</button>`:''}<button type="button" class="secondary" data-close>关闭</button></footer></form>`;
  document.body.append(dialog);dialog.showModal();
  dialog.querySelectorAll('[data-close],.icon-button').forEach(b=>b.onclick=()=>dialog.close());
  dialog.onclose=()=>{dialog.querySelectorAll('img').forEach(i=>URL.revokeObjectURL(i.src));dialog.remove();};
  dialog.querySelector('form').onsubmit=async event=>{event.preventDefault();if(!onSubmit)return;const submit=dialog.querySelector('[type=submit]');submit.disabled=true;try{const result=await onSubmit(Object.fromEntries(new FormData(event.currentTarget)),event.currentTarget);dialog.close();await render();notify(typeof result==='string'?result:'操作成功');}catch(error){dialog.querySelector('[role=alert]').textContent=error.message;}finally{submit.disabled=false;}};
  return dialog;
}
export const photoField=(required=false)=>`<label class="field"><span>现场照片</span><input name="photos" type="file" accept="image/png,image/jpeg" multiple ${required?'required':''}></label>`;
export async function upload(form){const ids=[];for(const file of form.elements.photos?.files||[]){const body=new FormData();body.set('file',file);ids.push((await api('/files',{method:'POST',body})).fileId);}return ids;}
export async function photos(dialog,items){for(const file of items){const response=await fetch(`${API}/files/${file.file_id}`,{headers:{Authorization:`Bearer ${state.token}`}});if(!response.ok)continue;const image=new Image();image.alt=file.original_name;image.src=URL.createObjectURL(await response.blob());dialog.querySelector('.photo-list')?.append(image);}}
export function download(name,data,type='application/json'){const url=URL.createObjectURL(new Blob([typeof data==='string'?data:JSON.stringify(data,null,2)],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
const titles={dashboard:'工作台',repairs:'报修工单',stay:'假期留宿',accommodation:'住宿信息',messages:'消息中心',buildings:'基础资料',students:'学生管理',managers:'宿管管理',repairers:'维修人员管理',logs:'操作日志',profile:'个人信息',rules:'报修规则',data:'导入导出与备份'};
function menus(){const common=[['dashboard','工作台'],['messages','消息中心'],['profile','个人信息']];switch(role()){case 'STUDENT':return [...common,['accommodation','我的住宿'],['repairs','我的报修'],['stay','假期留宿']];case 'DORM_MANAGER':return [...common,['repairs','报修审核与派单'],['stay','留宿审核'],['accommodation','楼栋住宿'],['buildings','楼栋床位']];case 'REPAIRER':return [...common,['repairs','我的维修任务']];default:return [...common,['repairs','全校报修'],['stay','留宿管理'],['accommodation','住宿分配'],['buildings','基础资料'],{label:'角色管理',children:[['students','学生管理'],['managers','宿管管理'],['repairers','维修人员管理']]},['rules','报修规则'],['logs','操作日志'],['data','导入导出与备份']];}}
function layout(content){const menu=menus().map(item=>Array.isArray(item)?`<button data-page="${item[0]}" class="${state.page===item[0]?'active':''}">${item[1]}</button>`:`<details class="nav-group" open><summary class="${item.children.some(([key])=>state.page===key)?'active':''}">${item.label}</summary><div class="nav-children">${item.children.map(([key,label])=>`<button data-page="${key}" class="${state.page===key?'active':''}">${label}</button>`).join('')}</div></details>`).join('');document.querySelector('#app').innerHTML=`<div class="shell"><aside class="sidebar"><h2>宿舍事务平台</h2><div class="role-tag">${roles[role()]}</div><nav class="nav">${menu}</nav><button class="logout" id="logout">退出登录</button></aside><main class="content"><div class="topbar"><div><div class="muted">${roles[role()]}</div><h1>${titles[state.page]}</h1></div><span>${esc(state.user.name)}</span></div>${content}</main></div><div id="toast" class="toast" role="status" hidden></div>`;
 document.querySelectorAll('button[data-page]').forEach(b=>b.onclick=()=>{state.page=b.dataset.page;render();});document.querySelector('#logout').onclick=async()=>{try{await post('/auth/logout');}finally{clearSession();login();}};
}
function login(error=''){document.querySelector('#app').innerHTML=`<div class="login"><form class="login-panel" id="login-form"><div class="brand-mark">宿</div><h1>宿舍事务平台</h1>${field('loginAccount','账号','text','')}${field('password','密码','password','')}<p class="error" role="alert">${esc(error)}</p><button class="primary full">登录</button></form></div>`;document.querySelector('#login-form').onsubmit=async e=>{e.preventDefault();const button=e.currentTarget.querySelector('button');button.disabled=true;try{const data=await post('/auth/login',Object.fromEntries(new FormData(e.currentTarget)));state.token=data.token;state.user=data.user;sessionStorage.setItem('dorm_token',data.token);sessionStorage.setItem('dorm_user',JSON.stringify(data.user));state.page='dashboard';await render();}catch(e){login(e.message);}};}
const pages={...adminPages,repairs:repairPage,stay:stayPage,
 async dashboard(){const d=await api('/dashboard');return `<section class="grid">${[['repairTotal','报修总量'],['repairPending','待处理'],['repairProcessing','处理中'],['repairClosed','已闭环'],['unread','未读消息'],['stayOpen','留宿批次']].map(([key,label])=>`<div class="stat"><span class="muted">${label}</span><strong>${d[key]}</strong></div>`).join('')}</section><section class="panel"><h3>维修评价</h3><p>平均评分：${Number(d.averageScore).toFixed(1)} / 5</p></section>${d.buildings?`<section class="panel"><h3>楼栋统计</h3>${table(d.buildings,[['building_name','楼栋'],['room_count','房间数'],['bed_count','床位数'],['occupied_count','入住人数']])}<p>当前已通过留宿：${d.stayApproved} 人；历史已完成：${d.stayCompleted} 人</p></section>`:''}`;},
 async profile(){const p=await api('/profile');state.data.profile=p;const fields=[['姓名',p.real_name],['账号',p.login_account],['联系电话',p.phone],['性别',({MALE:'男',FEMALE:'女',OTHER:'其他'})[p.gender]||'未填写'],['生日',p.birth_date],...(p.role_code==='STUDENT'?[['学号',p.student_no],['学院',p.department_name],['专业',p.major_name],['年级',p.grade],['班级',p.class_name],['学籍状态',p.enrollment_status]]:[]),...(['DORM_MANAGER','REPAIRER','ADMIN'].includes(p.role_code)?[['工号',p.employee_no],['入职时间',p.hire_date]]:[]),...(p.role_code==='DORM_MANAGER'?[['负责楼栋',p.manager_buildings]]:[]),...(p.role_code==='REPAIRER'?[['负责工种',p.work_types],['负责楼栋',p.repairer_buildings],['在岗状态',Number(p.on_duty)?'在岗':'离岗']]:[]),['账号状态',Number(p.enabled)?'启用':'停用'],['创建时间',p.account_created_at||p.created_at],['更新时间',p.account_updated_at||p.updated_at]];return `<section class="panel"><div class="toolbar"><h3>个人资料</h3><div class="actions">${button('编辑资料','profile-edit')}${button('修改密码','password')}</div></div><dl class="profile-grid">${fields.map(([label,value])=>`<div><dt>${label}</dt><dd>${esc(value??'未填写')}</dd></div>`).join('')}</dl></section>`;},
 async messages(){const rows=await api('/messages');return `<section class="panel"><div class="toolbar"><h3>站内消息</h3>${['ADMIN','DORM_MANAGER'].includes(role())?button('发布消息','publish-message'):''}</div>${table(rows,[['title','标题'],['content','内容'],['created_at','时间']],r=>r.read_at?'已读':button('标为已读','read-message',r.message_id),'message_id')}</section>`;}
};
let renderId=0;
export async function render(){
 if(!state.token||!state.user){login();return;}
 const current=++renderId;
 layout('<div class="empty">正在加载...</div>');
 try{
  const html=await pages[state.page]();
  if(current!==renderId||!state.token)return;
  layout(html);
  document.querySelectorAll('[data-action]').forEach(b=>b.onclick=async()=>{
   b.disabled=true;
   try{
    const a=b.dataset.action,id=b.dataset.id;
    if(a==='read-message'){await post(`/messages/${id}/read`);await render();}
    else if(a==='profile-edit'){const p=state.data.profile,gender=select('gender','性别',[['','未填写'],['MALE','男'],['FEMALE','女'],['OTHER','其他']],p.gender||'',false,false);const html=field('realName','姓名','text',p.real_name||'')+gender+field('birthDate','生日','date',p.birth_date||'',false)+field('phone','联系电话','tel',p.phone||'',false)+(role()==='ADMIN'?field('employeeNo','工号','text',p.employee_no||'',false)+field('hireDate','入职时间','date',p.hire_date||'',false):'');modal('编辑个人资料',html,async d=>{const updated=await put('/profile',d);state.user.name=updated.real_name;sessionStorage.setItem('dorm_user',JSON.stringify(state.user));return '个人资料已更新';});}
    else if(a==='password')modal('修改密码',field('oldPassword','原密码','password')+field('newPassword','新密码','password'),d=>put('/profile/password',d));
    else if(a==='publish-message'){
     const buildings=await api('/buildings');
     const admin=role()==='ADMIN';
     modal('发布消息',field('title','标题')+field('content','内容','textarea')+
      select('buildingId','楼栋范围',[...(admin?[['','按角色发送']]:[]),...buildings.map(x=>[x.building_id,x.building_name])],'',false,!admin)+
      (admin?select('targetRole','接收角色',[['ALL','全部'],['STUDENT','学生'],['DORM_MANAGER','宿管'],['REPAIRER','维修人员']]):'')+
      field('publishAt','发布时间','datetime-local','',false),d=>post('/messages',d));
    }else if(a.startsWith('repair-'))await repairAction(a,id,b);
    else if(a.startsWith('stay-'))await stayAction(a,id,b);
    else await adminAction(a,id,b);
   }catch(e){notify(e.message,true);}finally{b.disabled=false;}
  });
  const roleTable=document.querySelector('.role-table');
  if(roleTable){
   roleTable.addEventListener('scroll',()=>roleTable.classList.toggle('scroll-shifted',roleTable.scrollLeft>0),{passive:true});
   roleTable.addEventListener('change',event=>{
    const rows=[...roleTable.querySelectorAll('[data-select-row]')],all=roleTable.querySelector('[data-select-all]');
    if(event.target.matches('[data-select-all]'))rows.forEach(input=>input.checked=event.target.checked);
    if(all){const count=rows.filter(input=>input.checked).length;all.checked=rows.length>0&&count===rows.length;all.indeterminate=count>0&&count<rows.length;}
   });
  }
  const userFilter=document.querySelector('#user-filter-form');
  if(userFilter){
   userFilter.onsubmit=event=>{event.preventDefault();const filters=Object.fromEntries(new FormData(userFilter));for(const [key,value] of Object.entries(filters))if(!value)delete filters[key];state.data.userFilters??={};state.data.userFilters[state.page]=filters;render();};
    userFilter.addEventListener('change',event=>{if(event.target.matches('[data-directory-filter]'))cascadeDirectoryFilters(userFilter,event.target.name);});
  }
  const search=document.querySelector('#list-search');
  if(search)search.oninput=()=>document.querySelectorAll('tbody tr').forEach(row=>row.hidden=!row.textContent.toLowerCase().includes(search.value.toLowerCase()));
 }catch(e){
  if(!state.token||current!==renderId)return;
  layout(`<section class="panel"><p class="error">${esc(e.message)}</p><button class="secondary" id="retry">重新加载</button></section>`);
  document.querySelector('#retry').onclick=render;
 }
}
render();
