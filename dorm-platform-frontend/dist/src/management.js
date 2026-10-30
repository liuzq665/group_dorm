import {API,api,post,put,role,state,esc,button,field,select,check,table,modal,render,notify,download,statuses} from './app.js';

export const adminPages={
 async accommodation(){const [rows,history]=await Promise.all([api('/accommodations/current'),api('/accommodations/history')]);state.data.homes=rows;state.data.homeHistory=history;let roommates='';if(role()==='STUDENT')roommates=`<section class="panel"><h3>舍友</h3>${table(await api('/accommodations/roommates'),[['student_name','姓名'],['bed_no','床位']])}</section>`;return `<section class="panel"><div class="toolbar"><h3>当前住宿</h3><div class="actions">${role()==='ADMIN'?button('分配或调整床位','assign'):''}${button('导出住宿','export-homes')}</div></div>${table(rows,[['student_name','学生'],['building_name','楼栋'],['room_no','房间'],['bed_no','床位'],['check_in_date','入住日期']],r=>role()==='ADMIN'?button('退宿','checkout',r.assignment_id):'','assignment_id')}</section>${roommates}<section class="panel"><h3>住宿历史</h3>${table(history,[['student_name','学生'],['building_name','楼栋'],['room_no','房间'],['bed_no','床位'],['check_in_date','入住'],['check_out_date','退宿']])}</section>`;},
 async buildings(){const [buildings,rooms,beds]=await Promise.all([api('/buildings'),api('/rooms'),api('/beds')]);Object.assign(state.data,{buildings,rooms,beds});return [['buildings','楼栋',buildings,[['building_code','编号'],['building_name','名称'],['address','地址'],['gender_limit','性别'],['bed_count','床位'],['occupied_count','入住']],'building_id'],['rooms','宿舍',rooms,[['building_name','楼栋'],['room_no','房间'],['floor_no','楼层'],['design_capacity','容量']],'room_id'],['beds','床位',beds,[['building_name','楼栋'],['room_no','房间'],['bed_no','床位'],['management_status','管理状态'],['student_name','学生']],'bed_id']].map(([key,title,rows,columns,idKey])=>`<section class="panel"><div class="toolbar"><h3>${title}</h3><div class="actions">${role()==='ADMIN'?button('新增'+title,'resource-new',key):''}${button('导出','resource-export',key)}</div></div>${table(rows,columns,r=>role()==='ADMIN'?button('编辑','resource-edit',r[idKey],`data-type="${key}"`):'',idKey)}</section>`).join('');},
 async buildings(){if(role()==='ADMIN')return basicResourcePage('buildings');const rows=await api('/buildings');state.data.buildings=rows;return `<section class="panel"><h3>负责楼栋</h3>${table(rows,[['building_code','编号'],['building_name','名称'],['address','地址'],['gender_limit','性别限制'],['room_count','宿舍数'],['bed_count','总床位'],['available_bed_count','空闲床位']])}</section>`;},
 async rooms(){return basicResourcePage('rooms');},
 async beds(){return basicResourcePage('beds');},
 async students(){[state.data.academic,state.data.buildings,state.data.beds,state.data.rooms]=await Promise.all([api('/admin/academic-structure'),api('/buildings'),api('/beds'),api('/rooms')]);return userDirectory('students','学生管理','STUDENT');},
 async managers(){state.data.buildings=await api('/buildings');return userDirectory('managers','宿管管理','DORM_MANAGER');},
 async repairers(){[state.data.config,state.data.buildings]=await Promise.all([api('/admin/repair-config'),api('/buildings')]);return userDirectory('repairers','维修人员管理','REPAIRER');},
 async logs(){return `<section class="panel"><h3>操作日志</h3>${table(await api('/admin/logs'),[['real_name','操作人'],['module','模块'],['action','动作'],['business_id','业务编号'],['result','结果'],['occurred_at','时间']])}</section>`;},
 async rules(){const config=await api('/admin/repair-config');state.data.config=config;return `<section class="panel"><div class="toolbar"><h3>工单规则</h3>${button('发布规则版本','rule-edit')}</div>${table([config.rule],[['accept_minutes','接单时限/分钟'],['normal_minutes','普通维修/分钟'],['urgent_minutes','紧急维修/分钟'],['confirm_days','自动确认/天'],['edit_days','修改期限/天'],['max_rework_count','重修上限']])}</section><section class="panel"><h3>维修资质与负责范围</h3>${table(config.workers,[['real_name','维修人员'],['on_duty','在岗'],['max_active_orders','最大在办'],['workTypeIds','工种编号'],['buildingIds','楼栋编号']],r=>button('配置','worker-edit',r.repairer_user_id),'repairer_user_id')}</section><section class="panel"><div class="toolbar"><h3>维修工种</h3>${button('新增工种','dictionary-new','work-types')}</div>${table(config.workTypes,[['work_type_code','编号'],['work_type_name','名称'],['enabled','启用']],r=>button('编辑','dictionary-edit',r.work_type_id,'data-type="work-types"'))}</section><section class="panel"><div class="toolbar"><h3>故障分类</h3>${button('新增分类','dictionary-new','categories')}</div>${table(config.categories,[['category_name','名称'],['work_type_id','工种编号'],['enabled','启用']],r=>button('编辑','dictionary-edit',r.category_id,'data-type="categories"'))}</section>`;},
 async data(){const [tasks,backups]=await Promise.all([api('/admin/data-tasks'),api('/admin/backup-tasks')]);return `<section class="panel"><div class="toolbar"><h3>批量数据</h3>${button('刷新任务状态','refresh-tasks')}</div><div class="actions section-gap">${['users','buildings','rooms','beds','assignments'].map((type,i)=>button(['角色资料','楼栋','宿舍','床位','住宿分配'][i]+'导入','import',type)).join('')}</div><div class="actions section-gap">${[['users','角色资料'],['buildings','楼栋'],['rooms','宿舍'],['beds','床位'],['repairs','报修记录'],['stays','留宿记录']].map(([type,label])=>button('导出'+label,'data-export',type)).join('')}</div>${table(tasks,[['task_id','任务'],['task_type','类型'],['business_type','数据域'],['task_status','状态'],['result_description','结果'],['finished_at','完成时间']],r=>button('详情','task-detail',r.task_id)+(r.task_status==='WAITING'?button('取消','task-cancel',r.task_id):''))}</section><section class="panel"><div class="toolbar"><h3>数据库备份</h3>${button('创建备份任务','backup')}</div>${table(backups,[['task_id','任务'],['task_status','状态'],['result_description','结果'],['finished_at','完成时间']],r=>r.file_id?button('下载备份','task-download',r.file_id,'data-name="dorm-backup.sql"'):'')}</section>`;}
};
const resourceConfig={
 buildings:{title:'楼栋',id:'building_id',columns:[['building_code','编号'],['building_name','名称'],['address','地址'],['gender_limit','性别限制'],['room_count','宿舍数'],['bed_count','总床位'],['available_bed_count','空闲床位']],filterNames:['keyword','genderLimit','minBeds','maxBeds','minFreeBeds','maxFreeBeds']},
 rooms:{title:'宿舍',id:'room_id',columns:[['building_name','楼栋'],['room_no','宿舍号'],['floor_no','楼层'],['gender_limit','性别'],['design_capacity','容量'],['bed_count','床位数'],['available_bed_count','空闲床位']],filterNames:['buildingId','keyword','floorNo','minBeds','maxBeds','minFreeBeds','maxFreeBeds']},
 beds:{title:'床位',id:'bed_id',columns:[['building_name','楼栋'],['room_no','宿舍号'],['bed_no','床位号'],['management_status','管理状态'],['student_name','入住学生']],filterNames:['buildingId','roomId','keyword','managementStatus','occupied']}
};
async function basicResourcePage(type){
 const [buildings,rooms,beds]=await Promise.all([api('/buildings'),api('/rooms'),api('/beds')]);Object.assign(state.data,{buildings,rooms,beds});
 const config=resourceConfig[type],filters=state.data.resourceFilters?.[type]||{},rows=filterResourceRows(type,state.data[type],filters);
 const filterForm=resourceFilterForm(type,filters,buildings,rooms);
 const actions=row=>button('详情','resource-detail',row[config.id],`data-type="${type}"`)+button('编辑','resource-edit',row[config.id],`data-type="${type}"`)+button('删除','resource-delete',row[config.id],`data-type="${type}"`);
 const tools=button('新增'+config.title,'resource-new',type)+button('删除所选','resource-delete-selected',type)+button('导出','resource-export',type);
 return `<section class="panel"><div class="toolbar"><h3>${config.title}管理</h3><div class="actions">${tools}</div></div>${filterForm}<div class="resource-result-count">共 ${rows.length} 条</div>${resourceSelectableTable(rows,config.columns,actions,type,config.id)}</section>`;
}
function resourceFilterForm(type,filters,buildings,rooms){
 const pick=(name,label,items)=>select(name,label,items,filters[name]||'',false,false),number=(name,label)=>field(name,label,'number',filters[name]||'',false);
 const keyword=field('keyword',type==='buildings'?'名称或编号':type==='rooms'?'宿舍号':'床位号或学生姓名','search',filters.keyword||'',false);
 let fields=keyword;
 if(type==='buildings')fields+=pick('genderLimit','性别限制',[['','全部'],['男生','男生'],['女生','女生'],['混合','混合']])+number('minBeds','总床位从')+number('maxBeds','总床位至')+number('minFreeBeds','空闲床位从')+number('maxFreeBeds','空闲床位至');
 if(type==='rooms')fields=pick('buildingId','楼栋',[['','全部楼栋'],...buildings.map(x=>[x.building_id,x.building_name])])+fields+number('floorNo','楼层')+number('minBeds','容量从')+number('maxBeds','容量至')+number('minFreeBeds','空闲床位从')+number('maxFreeBeds','空闲床位至');
 if(type==='beds')fields=pick('buildingId','楼栋',[['','全部楼栋'],...buildings.map(x=>[x.building_id,x.building_name])])+pick('roomId','宿舍',[['','全部宿舍'],...rooms.filter(x=>!filters.buildingId||String(x.building_id)===String(filters.buildingId)).map(x=>[x.room_id,`${x.building_name} ${x.room_no}`])])+keyword+pick('managementStatus','床位状态',[['','全部状态'],['AVAILABLE','可分配'],['DISABLED','停用']])+pick('occupied','入住情况',[['','全部'],['yes','已入住'],['no','空闲']]);
 return `<form class="filter-grid resource-filter-grid" data-resource-filter="${type}">${fields}<div class="filter-actions"><button class="primary" type="submit">查询</button>${button('清空筛选','resource-filter-reset',type)}</div></form>`;
}
function filterResourceRows(type,rows,filters){
 const text=(...values)=>values.some(value=>String(value||'').toLowerCase().includes(String(filters.keyword||'').trim().toLowerCase()));
 const within=(value,min,max)=>(!min||Number(value)>=Number(min))&&(!max||Number(value)<=Number(max));
 return rows.filter(row=>{
  if(filters.keyword&&!text(type==='buildings'?[row.building_code,row.building_name,row.address]:type==='rooms'?[row.room_no,row.building_name]:[row.bed_no,row.student_name]))return false;
  if(type==='buildings')return(!filters.genderLimit||row.gender_limit===filters.genderLimit)&&within(row.bed_count,filters.minBeds,filters.maxBeds)&&within(row.available_bed_count,filters.minFreeBeds,filters.maxFreeBeds);
  if(type==='rooms')return(!filters.buildingId||String(row.building_id)===String(filters.buildingId))&&(!filters.floorNo||Number(row.floor_no)===Number(filters.floorNo))&&within(row.design_capacity,filters.minBeds,filters.maxBeds)&&within(row.available_bed_count,filters.minFreeBeds,filters.maxFreeBeds);
  return(!filters.buildingId||String(row.building_id)===String(filters.buildingId))&&(!filters.roomId||String(row.room_id)===String(filters.roomId))&&(!filters.managementStatus||row.management_status===filters.managementStatus)&&(!filters.occupied||(filters.occupied==='yes'?!!row.student_id:!row.student_id));
 });
}
function resourceSelectableTable(rows,columns,actions,type,idKey){
 return table(rows,columns,actions,idKey).replace('<thead><tr>','<thead><tr><th class="select-col"><input type="checkbox" data-resource-select-all aria-label="全选"></th>')
  .replace(/<tr data-row-id="([^"]*)">/g,(_,id)=>`<tr data-row-id="${id}"><td class="select-col"><input type="checkbox" data-resource-select-row value="${id}" aria-label="选择记录"></td>`)
  .replace('<div class="table-wrap">',`<div class="table-wrap resource-table" data-resource-type="${type}">`);
}
function resourceDetail(type,id){
 const config=resourceConfig[type],row=state.data[type].find(x=>String(x[config.id])===String(id));if(!row)return;
 let facts=[];let extra='';
 if(type==='buildings'){
  facts=[['编号',row.building_code],['名称',row.building_name],['地址',row.address],['性别限制',row.gender_limit],['总床位',row.bed_count],['空闲床位',row.available_bed_count]];
  const rooms=state.data.rooms.filter(x=>Number(x.building_id)===Number(id));extra=`<section class="detail-section"><h3>楼栋宿舍</h3>${rooms.length?`<ol class="resource-detail-list">${rooms.map(x=>`<li>${esc(x.room_no)} · ${esc(x.floor_no)}层 · ${esc(x.gender_limit)} · 容量 ${esc(x.design_capacity)} · 空闲 ${esc(x.available_bed_count)}</li>`).join('')}</ol>`:'<p class="muted">暂无宿舍</p>'}</section>`;
 }
 if(type==='rooms'){
  facts=[['楼栋',row.building_name],['宿舍号',row.room_no],['楼层',row.floor_no],['性别',row.gender_limit],['容量',row.design_capacity],['空闲床位',row.available_bed_count]];
  const beds=state.data.beds.filter(x=>Number(x.room_id)===Number(id));extra=`<section class="detail-section"><div class="toolbar"><h3>床位与入住学生</h3><button type="button" class="secondary" data-room-occupants>调整入住学生</button></div>${beds.length?`<ol class="resource-detail-list">${beds.map(x=>`<li>${esc(x.bed_no)}号床 · ${x.student_name?`入住：${esc(x.student_name)}`:'空闲'}</li>`).join('')}</ol>`:'<p class="muted">暂无床位</p>'}</section>`;
 }
 if(type==='beds')facts=[['楼栋',row.building_name],['宿舍号',row.room_no],['床位号',row.bed_no],['床位状态',row.management_status==='AVAILABLE'?'可分配':'停用'],['入住学生',row.student_name||'空闲'],['宿舍性别',row.room_gender_limit]];
 const dialog=modal(`${config.title}详情`,`<div class="user-detail-content">${factGrid(facts)}${extra}</div>`,null);
 if(type==='rooms')dialog.querySelector('[data-room-occupants]')?.addEventListener('click',()=>roomOccupantsDialog(row));
}
async function roomOccupantsDialog(room){
 const [allStudents,beds]=await Promise.all([api('/admin/users?roleCode=STUDENT'),api('/beds')]);
 const roomBeds=beds.filter(x=>Number(x.room_id)===Number(room.room_id));
 const eligible=allStudents.filter(x=>{const resident=x.current_building===room.building_name&&String(x.current_room)===String(room.room_no);const assignable=!x.current_building&&Number(x.enabled)===1&&x.enrollment_status==='ENROLLED';return(resident||assignable)&&((room.gender_limit==='男生'&&x.gender==='MALE')||(room.gender_limit==='女生'&&x.gender==='FEMALE'));});
 const html=roomBeds.map(bed=>{const options=eligible.filter(student=>bed.management_status==='AVAILABLE'||Number(student.user_id)===Number(bed.student_id));return select(`bed_${bed.bed_id}`,`${bed.bed_no}号床`,[['','空床'],...options.map(x=>[x.user_id,`${x.student_no} · ${x.real_name}`])],bed.student_id||'',false,false);}).join('');
 modal(`调整 ${room.room_no} 宿舍入住学生`,`<div class="room-occupant-grid">${html}</div>`,(data,form)=>{const ids=roomBeds.map(bed=>({bedId:bed.bed_id,studentId:form.elements[`bed_${bed.bed_id}`].value||null}));const chosen=ids.map(x=>x.studentId).filter(Boolean);if(new Set(chosen).size!==chosen.length)throw new Error('同一学生不能选择多个床位');return put(`/admin/rooms/${room.room_id}/occupants`,{occupants:ids});});
}
const roleLabels={STUDENT:'学生',DORM_MANAGER:'宿管',REPAIRER:'维修人员',ADMIN:'系统管理员'};
async function userDirectory(page,title,roleCode=null){
 const filters=state.data.userFilters?.[page]||{};
 const managers=page==='managers';
 const repairers=page==='repairers';
 const students=page==='students';
 const defaultGender=repairers?'MALE':'FEMALE';
 const gender=filters.gender||defaultGender;
 const params=new URLSearchParams(Object.entries({...filters,gender,...(roleCode?{roleCode}:{})}).filter(([,value])=>value!==''&&value!=null));
 const rows=await api(`/admin/users?${params}`);state.data.users=rows;
 const academic=state.data.academic||{departments:[],majors:[],classes:[]};
 const buildings=state.data.buildings||[];
 const selectedDept=academic.departments.find(x=>String(x.department_id)===String(filters.departmentId));
 const majorsForFilter=academic.majors.filter(x=>!selectedDept||Number(x.department_id)===Number(selectedDept.department_id));
 const selectedMajor=majorsForFilter.find(x=>String(x.major_id)===String(filters.majorId));
 const academicClasses=academic.classes.filter(x=>(!selectedDept||majorsForFilter.some(major=>Number(major.major_id)===Number(x.major_id)))&&(!selectedMajor||Number(x.major_id)===Number(selectedMajor.major_id)));
 const classesForFilter=academicClasses.filter(x=>!filters.grade||String(x.enrollment_year)===String(filters.grade));
 const filterFields=students
  ? combo('realName','姓名',[],filters.realName||'')+combo('studentNo','学号',[],filters.studentNo||'')+filterSelect('buildingName','楼栋',[['','全部楼栋'],...buildings.map(x=>[x.building_name,x.building_name])],filters.buildingName||'')+filterSelect('roomNo','房间',[['','全部房间'],...(state.data.rooms||[]).filter(x=>!filters.buildingName||x.building_name===filters.buildingName).map(x=>[x.room_no,x.room_no])],filters.roomNo||'')+filterSelect('departmentId','学院',[['','全部学院'],...academic.departments.map(x=>[x.department_id,x.department_name])],filters.departmentId||'')+filterSelect('majorId','专业',[['','全部专业'],...majorsForFilter.map(x=>[x.major_id,x.major_name])],filters.majorId||'')+filterSelect('grade','年级',[['','全部年级'],...unique(academicClasses.map(x=>x.enrollment_year).filter(Boolean).map(String)).map(x=>[x,`${x}级`])],filters.grade||'')+filterSelect('classId','班级',[['','全部班级'],...classesForFilter.map(x=>[x.class_id,x.class_name])],filters.classId||'')+accountState(filters)+select('accommodation','住宿状态',[['','全部住宿状态'],['ASSIGNED','已分配'],['UNASSIGNED','未分配']],filters.accommodation||'',false,false)
  : managers
   ? combo('realName','姓名',[],filters.realName||'')+combo('employeeNo','工号',[],filters.employeeNo||'')+filterSelect('managerBuildingName','负责楼栋',[['','全部楼栋'],...buildings.map(x=>[x.building_name,x.building_name])],filters.managerBuildingName||'')+accountState(filters)+onDutyState(filters)
   : combo('realName','姓名',[],filters.realName||'')+combo('employeeNo','工号',[],filters.employeeNo||'')+filterSelect('workTypeName','工种',[['','全部工种'],...unique(state.data.config.workTypes.map(x=>x.work_type_name)).map(x=>[x,x])],filters.workTypeName||'')+filterSelect('repairBuildingName','负责楼栋',[['','全部楼栋'],...buildings.map(x=>[x.building_name,x.building_name])],filters.repairBuildingName||'')+accountState(filters)+onDutyState(filters);
 const columns=students?[['student_no','学号'],['real_name','姓名'],['login_account','账号'],['department_name','学院'],['major_name','专业'],['grade','年级'],['class_name','班级'],['current_room_label','当前住宿'],['enabled','账号状态']]:managers?[['employee_no','工号'],['real_name','姓名'],['login_account','账号'],['manager_buildings','负责楼栋'],['manager_on_duty','在岗'],['enabled','账号状态']]:[['employee_no','工号'],['real_name','姓名'],['login_account','账号'],['work_types','工种'],['repairer_buildings','负责楼栋'],['on_duty','在岗'],['enabled','账号状态']];
 const actions=r=>button('详情','user-detail',r.user_id)+button('编辑','user-edit',r.user_id)+button(Number(r.enabled)?'停用':'启用','user-toggle',r.user_id)+button('删除','user-delete',r.user_id);
 const tools=button(students?'新增学生':managers?'新增宿管':'新增维修人员','user-new')+(students?button('分配/调整宿舍','assign'):managers?button('配置负责楼栋','manager-scope-select'):button('配置维修范围','worker-scope-select'));
 const rowsForTable=rows.map(row=>({...row,current_room_label:row.current_building?`${row.current_building} · ${row.current_room} · ${row.current_bed}`:'未分配',manager_buildings:row.manager_buildings?.replace(/,\s*/g,'\n'),work_types:row.work_types?.replace(/,\s*/g,'\n'),repairer_buildings:row.repairer_buildings?.replace(/,\s*/g,'\n')}));
  const directoryTable=selectableTable(rowsForTable,columns,actions,page);
 return `<section class="panel"><div class="toolbar"><h3>${title}</h3><div class="actions">${tools}</div></div><form id="user-filter-form" class="filter-grid ${students?'student-filter-grid':managers?'manager-filter-grid':'repairer-filter-grid'}" data-page="${page}">${filterFields}<div class="filter-actions"><button class="primary" type="submit">查询</button>${button('清空筛选','user-filter-reset')}<label class="gender-switch"><span>男</span><input type="checkbox" role="switch" data-gender-toggle ${gender==='FEMALE'?'checked':''} aria-label="切换显示性别"><span>女</span><input type="hidden" name="gender" value="${gender}"></label></div></form>${directoryTable}</section>`;
}
function selectableTable(rows,columns,actions,page){
 return table(rows,columns,actions,'user_id')
  .replace('<thead><tr>','<thead><tr><th class="select-col"><input type="checkbox" data-select-all aria-label="全选"></th>')
  .replace(/<tr data-row-id="([^"]*)">/g,(_,id)=>`<tr data-row-id="${id}"><td class="select-col"><input type="checkbox" data-select-row value="${id}" aria-label="选择人员"></td>`)
  .replace('<div class="table-wrap">',`<div class="table-wrap role-table role-table-${page}">`);
}
function combo(name,label,items,value=''){const listId=`filter-${name}`;return `<label class="field"><span>${label}</span><input name="${name}" type="search" list="${listId}" value="${esc(value)}" autocomplete="off"><datalist id="${listId}">${unique(items).map(item=>`<option value="${esc(item)}"></option>`).join('')}</datalist></label>`;}
function unique(items){return [...new Set(items.filter(x=>x!=null&&String(x).trim()!=='' ).map(String))].sort((a,b)=>a.localeCompare(b,'zh-CN'));}
function checkboxChoices(name,items,selected=[]){const chosen=new Set([...selected].map(String)),title=name==='buildingIds'?'负责楼栋':'维修工种';return `<fieldset class="choice-group"><legend>${title}</legend><details class="checkbox-dropdown"><summary><span class="checkbox-dropdown-value">${[...chosen].map(id=>items.find(([value])=>String(value)===id)?.[1]).filter(Boolean).map(esc).join('、')||'请选择'+title}</span></summary><div class="checkbox-dropdown-menu">${items.map(([id,label])=>`<label><span>${esc(label)}</span><input type="checkbox" name="${name}" value="${esc(id)}" ${chosen.has(String(id))?'checked':''}></label>`).join('')||'<span class="muted">暂无可选项</span>'}</div></details></fieldset>`;}
function bindChoiceDropdown(dialog){dialog.querySelectorAll('.checkbox-dropdown').forEach(dropdown=>dropdown.addEventListener('change',()=>{const labels=[...dropdown.querySelectorAll('input[type="checkbox"]:checked')].map(input=>input.closest('label').querySelector('span').textContent);dropdown.querySelector('.checkbox-dropdown-value').textContent=labels.join('、')||'请选择'+dropdown.closest('.choice-group').querySelector('legend').textContent;}));}
function checkedValues(form,name){return [...form.querySelectorAll(`input[name="${name}"]:checked`)].map(input=>Number(input.value));}
function selectedUserIds(){return [...document.querySelectorAll('.role-table [data-select-row]:checked')].map(input=>Number(input.value));}
function genderMatches(gender,limit){return limit==='混合'||(gender==='MALE'&&limit==='男生')||(gender==='FEMALE'&&limit==='女生');}
function refillSelect(element,placeholder,items,selected=''){element.innerHTML=`<option value="">${placeholder}</option>`+items.map(([value,label])=>`<option value="${esc(value)}" ${String(value)===String(selected)?'selected':''}>${esc(label)}</option>`).join('');}
async function assignmentDialog(targetStudentId=null,onCancel=null,staging=null){
 const selected=staging?[]:targetStudentId==null?selectedUserIds():[Number(targetStudentId)];
 if(!staging&&state.page==='students'&&!selected.length){notify('请先勾选要分配住宿的学生',true);return;}
 const [allStudents,beds]=await Promise.all([api('/admin/users?roleCode=STUDENT&enabled=true'),api('/beds')]);
 const students=staging?[{...staging.student,user_id:staging.userId??'draft'}]:selected.length?allStudents.filter(x=>selected.includes(Number(x.user_id))):allStudents;
 if(!students.length){notify('没有可分配住宿的启用学生',true);return;}
 const initial=staging?String(staging.userId??'draft'):students.length===1?students[0].user_id:'';
 const buildingField=select('buildingFilter','楼栋',[['','全部楼栋']],'',false,false);
 const html=select('studentId','学生',students.map(x=>[x.user_id,`${x.student_no||'无学号'} · ${x.real_name}`]),initial)+
  buildingField+select('roomFilter','房间',[['','全部房间']],'',false,false)+
  select('bedNoFilter','床位',[['','全部床位']],'',false,false)+`<div class="bed-choice-list" role="listbox" aria-label="可分配床位"></div><input type="hidden" name="bedId">`;
 let selectedBedId=String(staging?.bedId||'');
 let submitted=false;
 const dialog=modal('分配或调整住宿',`<div class="assignment-form">${html}</div>`,staging?null:data=>{if(!selectedBedId)throw new Error('请从可分配床位列表中选择床位');data.bedId=selectedBedId;return post('/admin/assignments',data).then(result=>{submitted=true;return result;});});
 if(onCancel)dialog.addEventListener('close',()=>{if(!submitted)onCancel();},{once:true});
 if(staging){const footer=dialog.querySelector('.dialog-footer');footer.insertAdjacentHTML('afterbegin','<button type="button" class="primary" data-stage-bed>保存选择</button>');footer.querySelector('[data-stage-bed]').onclick=()=>{const chosen=beds.find(x=>String(x.bed_id)===selectedBedId);if(!chosen){notify('请从可分配床位列表中选择床位',true);return;}submitted=true;dialog.close();staging.onSave(chosen);};}
 const form=dialog.querySelector('form'),student=form.elements.studentId,building=form.elements.buildingFilter,room=form.elements.roomFilter,bedNo=form.elements.bedNoFilter,bed=form.elements.bedId;
 const available=()=>{const person=students.find(x=>String(x.user_id)===student.value);if(!person)return[];return beds.filter(x=>x.management_status==='AVAILABLE'&&(!x.student_id||Number(x.student_id)===Number(person.user_id))&&genderMatches(person.gender,x.room_gender_limit||x.gender_limit));};
 const refresh=()=>{
  const candidates=available(),buildingIds=unique(candidates.map(x=>x.building_id));
  const selectedBuilding=buildingIds.includes(String(building.value))?building.value:'';
  refillSelect(building,'全部楼栋',buildingIds.map(value=>{const row=candidates.find(x=>String(x.building_id)===value);return[value,row.building_name];}),selectedBuilding);
  const roomRows=candidates.filter(x=>!building.value||String(x.building_id)===building.value),roomIds=unique(roomRows.map(x=>x.room_id));
  const selectedRoom=roomIds.includes(String(room.value))?room.value:'';
  refillSelect(room,'全部房间',roomIds.map(value=>{const row=roomRows.find(x=>String(x.room_id)===value);return[value,row.room_no];}),selectedRoom);
  const bedRows=roomRows.filter(x=>!room.value||String(x.room_id)===room.value),bedNos=unique(bedRows.map(x=>x.bed_no));
  const selectedNo=bedNos.includes(bedNo.value)?bedNo.value:'';
  refillSelect(bedNo,'全部床位',bedNos.map(value=>[value,value]),selectedNo);
  const choices=bedRows.filter(x=>!bedNo.value||x.bed_no===bedNo.value);
   if(!choices.some(x=>String(x.bed_id)===selectedBedId))selectedBedId='';
   form.elements.bedId.value=selectedBedId;
   dialog.querySelector('.bed-choice-list').innerHTML=choices.length?choices.map(x=>`<button type="button" role="option" aria-selected="${String(x.bed_id)===selectedBedId}" class="bed-choice ${String(x.bed_id)===selectedBedId?'selected':''}" data-bed-id="${x.bed_id}"><span>${esc(x.building_name)}</span><span>${esc(x.room_no)} 室</span><strong>${esc(x.bed_no)} 号床</strong></button>`).join(''):'<div class="empty">暂无符合条件的可分配床位</div>';
 };
 student.onchange=()=>{building.value='';room.value='';bedNo.value='';refresh();};
 building.onchange=()=>{room.value='';bedNo.value='';refresh();};room.onchange=()=>{bedNo.value='';refresh();};bedNo.onchange=refresh;
 dialog.querySelector('.bed-choice-list').addEventListener('click',event=>{const choice=event.target.closest('[data-bed-id]');if(!choice)return;selectedBedId=choice.dataset.bedId;refresh();});
 refresh();
}
async function managerScopeDialog(managerId){
 const [person,buildings,managers]=await Promise.all([api(`/admin/users/${managerId}`),api('/buildings'),api('/admin/users?roleCode=DORM_MANAGER')]);
 const occupied=new Set(managers.filter(x=>Number(x.user_id)!==Number(managerId)).flatMap(x=>(x.manager_buildings||'').split(',').map(name=>name.trim())));
 const choices=buildings.filter(x=>!occupied.has(x.building_name)||person.buildingIds?.map(Number).includes(Number(x.building_id)));
 modal('配置宿管负责楼栋',select('buildingId','负责楼栋',[['','暂不分配'],...choices.map(x=>[x.building_id,x.building_name])],person.buildingIds?.[0]||'',false,false),(data)=>put(`/admin/managers/${managerId}/buildings`,data));
}
async function repairerScopeDialog(repairerId){
 const [person,buildings]=await Promise.all([api(`/admin/users/${repairerId}`),state.data.buildings?.length?Promise.resolve(state.data.buildings):api('/buildings')]),types=state.data.config?.workTypes||[];
 const html=check('onDuty','在岗',!!person.profile.on_duty)+field('maxActiveOrders','最大在办工单（空值为不限）','number',person.profile.max_active_orders??'',false)+checkboxChoices('workTypeIds',types.map(x=>[x.work_type_id,x.work_type_name]),person.workTypes.map(x=>x.work_type_id))+checkboxChoices('buildingIds',buildings.map(x=>[x.building_id,x.building_name]),person.buildingIds||[]);
 const dialog=modal('配置维修范围',html,(data,form)=>put(`/admin/repairers/${repairerId}`,{...data,onDuty:!!data.onDuty,workTypeIds:checkedValues(form,'workTypeIds'),buildingIds:checkedValues(form,'buildingIds')}));bindChoiceDropdown(dialog);
}
function filterSelect(name,label,items,value=''){return select(name,label,items,value,false,false).replace('<select ', '<select data-directory-filter ');}
function accountState(filters){return select('enabled','账号状态',[['','全部账号状态'],['true','启用'],['false','停用']],filters.enabled||'',false,false);}
function onDutyState(filters){return select('onDuty','在岗状态',[['','全部在岗状态'],['true','在岗'],['false','离岗']],filters.onDuty||'',false,false);}
export function cascadeDirectoryFilters(form,changedName){
 if(form.dataset.page!=='students')return;
 const academic=state.data.academic||{departments:[],majors:[],classes:[]};
 const value=name=>form.elements[name]?.value||'';
 const refill=(name,placeholder,items)=>{const element=form.elements[name];if(element)refillSelect(element,placeholder,items,element.value);};
 const departmentId=value('departmentId'),majorId=value('majorId'),grade=value('grade');
 const majors=academic.majors.filter(x=>!departmentId||Number(x.department_id)===Number(departmentId));
 if(majorId&&!majors.some(x=>String(x.major_id)===majorId))form.elements.majorId.value='';
 const selectedMajor=value('majorId');
 const classes=academic.classes.filter(x=>(!departmentId||majors.some(major=>Number(major.major_id)===Number(x.major_id)))&&(!selectedMajor||Number(x.major_id)===Number(selectedMajor)));
 if(grade&&!classes.some(x=>String(x.enrollment_year)===grade))form.elements.grade.value='';
 const activeGrade=value('grade'),gradeClasses=classes.filter(x=>!activeGrade||String(x.enrollment_year)===activeGrade);
 if(value('classId')&&!gradeClasses.some(x=>String(x.class_id)===value('classId')))form.elements.classId.value='';
 refill('majorId','全部专业',majors.map(x=>[x.major_id,x.major_name]));
 refill('grade','全部年级',unique(classes.map(x=>x.enrollment_year).filter(Boolean).map(String)).map(x=>[x,`${x}级`]));
 refill('classId','全部班级',gradeClasses.map(x=>[x.class_id,x.class_name]));
 const buildings=state.data.buildings||[],selectedBuilding=value('buildingName'),building=buildings.find(x=>x.building_name===selectedBuilding);
 const rooms=(state.data.rooms||[]).filter(x=>!building||Number(x.building_id)===Number(building.building_id));
 if(value('roomNo')&&!rooms.some(x=>x.room_no===value('roomNo')))form.elements.roomNo.value='';
 refill('roomNo','全部房间',unique(rooms.map(x=>x.room_no)).map(x=>[x,x]));
}
function factGrid(entries){return `<dl class="detail-grid">${entries.map(([label,value])=>`<div><dt>${label}</dt><dd>${esc(value??'-')}</dd></div>`).join('')}</dl>`;}
function summaryGrid(entries){return `<div class="detail-summary">${entries.map(([label,value])=>`<div><span>${label}</span><strong>${esc(value??0)}</strong></div>`).join('')}</div>`;}
function detailSection(title,rows,columns,key){return `<section class="detail-section"><h3>${title}</h3>${table(rows,columns,()=>'',key)}</section>`;}
function recordButton(label,key){return `<button type="button" class="secondary" data-record="${key}">${label}</button>`;}
function stackedText(values){return values.length?values.join('\n'):'未配置';}
function stacked(values){return values.length?`<div class="stacked-list">${values.map(x=>`<span>${esc(x)}</span>`).join('')}</div>`:'<span class="muted">未配置</span>';}
function bindDetailRecords(dialog,data,homeHtml){
 const body=dialog.querySelector('.dialog-body');
 const records={
  accommodationHistory:['住宿历史',data.accommodationHistory,[['building_name','楼栋'],['room_no','房间'],['bed_no','床位'],['check_in_date','入住'],['check_out_date','退宿'],['assignment_type','类型']],'assignment_id'],
  repairs:[data.role_code==='REPAIRER'?'历史维修与评价':'报修记录',data.repairs,[['order_no','工单号'],['title','标题'],['current_status','状态'],['repairer_name','维修人员'],['dispatch_status','派单状态'],['score','评分'],['comment','评价'],['created_at','时间']],'order_id'],
  stays:['留宿记录',data.stays,[['batch_name','批次'],['current_status','状态'],['start_date','开始'],['end_date','结束'],['updated_at','更新时间']],'application_id']
 };
 dialog.querySelectorAll('[data-record]').forEach(button=>button.onclick=()=>{
  const [title,rows,columns,key]=records[button.dataset.record];
  body.innerHTML=`<div class="record-view"><div class="toolbar"><h3>${title}</h3><button type="button" class="secondary" data-record-back>返回详情</button></div>${table(rows,columns,()=>'',key)}</div>`;
  body.querySelector('[data-record-back]').onclick=()=>{body.innerHTML=`<div class="user-detail-content">${homeHtml}</div>`;bindDetailRecords(dialog,data,homeHtml);};
 });
}
function bindAcademicEditor(dialog,academic,row,selected={}){
 const form=dialog.querySelector('form'),department=form.elements.departmentId,major=form.elements.majorId,grade=form.elements.grade,classId=form.elements.classId;
 const refill=(selectEl,items,placeholder,value='')=>{selectEl.innerHTML=`<option value="">${placeholder}</option>`+items.map(([id,label])=>`<option value="${esc(id)}" ${String(id)===String(value)?'selected':''}>${esc(label)}</option>`).join('');};
 const majors=()=>academic.majors.filter(x=>(x.enabled||[row?.major_id,selected.majorId].map(String).includes(String(x.major_id)))&&(!department.value||Number(x.department_id)===Number(department.value)));
 const classes=()=>academic.classes.filter(x=>(x.enabled||[row?.class_id,selected.classId].map(String).includes(String(x.class_id)))&&(!major.value||Number(x.major_id)===Number(major.value))&&(!grade.value||Number(x.enrollment_year)===Number(grade.value)));
 department.onchange=()=>{if(!majors().some(x=>String(x.major_id)===major.value))major.value='';refresh();};
 major.onchange=()=>{grade.value='';classId.value='';refresh();};
 grade.onchange=()=>{classId.value='';refresh();};
  classId.onchange=()=>{const item=academic.classes.find(x=>String(x.class_id)===classId.value);if(item){major.value=String(item.major_id);department.value=String(academic.majors.find(x=>String(x.major_id)===String(item.major_id))?.department_id||'');grade.value=item.enrollment_year?String(item.enrollment_year):'';refresh(classId.value);}};
 function refresh(selectedClass=classId.value){refill(major,majors().map(x=>[x.major_id,x.major_name]),'请选择专业',major.value);const options=classes();refill(grade,unique(options.map(x=>x.enrollment_year).filter(Boolean)).map(x=>[x,`${x}级`]),'请选择年级',grade.value);refill(classId,options.map(x=>[x.class_id,x.class_name]),'请选择班级',selectedClass);}
 if(selected.departmentId)department.value=String(selected.departmentId);
 if(selected.majorId)major.value=String(selected.majorId);
 if(selected.grade)grade.value=String(selected.grade);
 if(selected.classId)classId.value=String(selected.classId);
 refresh(selected.classId||row?.class_id||'');
}
export async function adminAction(action,id,b){
 if(action==='export-homes'){download('accommodation.json',state.data.homeHistory);return;}
 if(action==='resource-export'){download(id+'.json',state.data[id]);return;}
 if(action==='resource-filter-reset'){if(state.data.resourceFilters)delete state.data.resourceFilters[id];await render();return;}
 if(action==='resource-detail'){resourceDetail(b.dataset.type,id);return;}
 if(action==='resource-delete'||action==='resource-delete-selected'){
  const type=action==='resource-delete'?b.dataset.type:id;
  const ids=action==='resource-delete'?[Number(id)]:[...document.querySelectorAll(`.resource-table[data-resource-type="${type}"] [data-resource-select-row]:checked`)].map(input=>Number(input.value));
  if(!ids.length){notify('请先选择要删除的记录',true);return;}
  modal(`删除${resourceConfig[type].title}`,`确定删除选中的 ${ids.length} 条${resourceConfig[type].title}记录？存在关联业务数据的记录无法删除。`,async()=>{await api(`/admin/resources/${type}`,{method:'DELETE',body:JSON.stringify({ids})});return '删除成功';},'确认删除');return;
 }
 if(action==='data-export'){await post('/admin/data-tasks',{taskType:'EXPORT',businessType:id});await render();notify('导出任务已受理');return;}
 if(action==='user-filter-reset'){if(state.data.userFilters)delete state.data.userFilters[state.page];await render();return;}
 if(action==='manager-scope-select'){
  const managers=selectedUserIds();if(managers.length!==1){notify('请勾选一名宿管进行配置',true);return;}await managerScopeDialog(managers[0]);return;
 }
 if(action==='worker-scope-select'){
  const workers=selectedUserIds();if(workers.length!==1){notify('请勾选一名维修人员进行配置',true);return;}await repairerScopeDialog(workers[0]);return;
 }
 if(action==='assign'){await assignmentDialog();return;}
 if(action==='checkout'){modal('确认退宿','',()=>post(`/admin/assignments/${id}/checkout`),'确认');return;}
 if(action==='user-new'||action==='user-edit'){
  const draft=state.data.studentEditDraft?.userId===id?state.data.studentEditDraft.data:null;
  if(draft)delete state.data.studentEditDraft;
  const row=state.data.users?.find(u=>String(u.user_id)===id),roleCode=state.page==='students'?'STUDENT':state.page==='managers'?'DORM_MANAGER':'REPAIRER',person=row?await api(`/admin/users/${id}`):null;
  const value=(key,fallback='')=>draft?.[key]??fallback;
  const account=field('account','登录账号','text',value('account',row?.login_account||''));
  const password=field('password',row?'重置密码':'初始密码','password',value('password',''),!row);
  const personal=field('realName','姓名','text',value('realName',row?.real_name||''))+select('gender','性别',[['','请选择'],['MALE','男'],['FEMALE','女'],['OTHER','其他']],value('gender',row?.gender||''),false,true)+field('birthDate','生日','date',value('birthDate',row?.birth_date||''),false)+field('phone','联系电话','tel',value('phone',row?.phone||''),false);
  let roleFields='';
  if(roleCode==='STUDENT'){
   const academic=state.data.academic, departments=academic.departments.filter(x=>x.enabled||String(x.department_id)===String(row?.department_id));
   const majors=academic.majors.filter(x=>(x.enabled||String(x.major_id)===String(row?.major_id))&&(!row?.department_id||Number(x.department_id)===Number(row.department_id)));
   const classes=academic.classes.filter(x=>(x.enabled||String(x.class_id)===String(row?.class_id))&&(!row?.major_id||Number(x.major_id)===Number(row.major_id)));
   roleFields=field('studentNo','学号','text',row?.student_no||'')+select('departmentId','学院',[['','请选择学院'],...departments.map(x=>[x.department_id,x.department_name])],row?.department_id||'',false,false)+select('majorId','专业',[['','请选择专业'],...majors.map(x=>[x.major_id,x.major_name])],row?.major_id||'',false,false)+select('grade','年级',[['','请选择年级'],...unique(classes.map(x=>x.enrollment_year).filter(Boolean)).map(x=>[x,`${x}级`])],row?.enrollment_year||'',false,false)+select('classId','班级',[['','请选择班级'],...classes.filter(x=>!row?.enrollment_year||Number(x.enrollment_year)===Number(row.enrollment_year)).map(x=>[x.class_id,x.class_name])],row?.class_id||'',false,false)+select('enrollmentStatus','学籍状态',[['ENROLLED','在读'],['SUSPENDED','休学'],['GRADUATED','毕业'],['WITHDRAWN','退学'],['UNKNOWN','未登记']],row?.enrollment_status||'ENROLLED');
  }else{
   roleFields=field('employeeNo','工号','text',row?.employee_no||'')+field('hireDate','入职时间','date',row?.hire_date||'',false);
   if(roleCode==='DORM_MANAGER')roleFields+=check('onDuty','在岗',row?!!row.manager_on_duty:true)+checkboxChoices('buildingIds',(state.data.buildings||[]).map(x=>[x.building_id,x.building_name]),person?.buildingIds||[]);
   if(roleCode==='REPAIRER')roleFields+=check('onDuty','在岗',person?!!person.profile.on_duty:true)+field('maxActiveOrders','最大在办工单（空值为不限）','number',person?.profile.max_active_orders??'',false)+checkboxChoices('workTypeIds',(state.data.config?.workTypes||[]).map(x=>[x.work_type_id,x.work_type_name]),person?.workTypes?.map(x=>x.work_type_id)||[])+checkboxChoices('buildingIds',(state.data.buildings||[]).map(x=>[x.building_id,x.building_name]),person?.buildingIds||[]);
  }
  const accommodation=person?.currentAccommodation?.[0],stagedHome=draft?.stagedAccommodation,currentHome=stagedHome?`${stagedHome.building_name} · ${stagedHome.room_no} · ${stagedHome.bed_no}（待保存）`:accommodation?`${accommodation.building_name} · ${accommodation.room_no} · ${accommodation.bed_no}`:'尚未分配';
  const accommodationAction=roleCode==='STUDENT'?`<input type="hidden" name="bedId" value="${esc(value('bedId',''))}"><div class="edit-extra-action"><span>当前住宿：${esc(currentHome)}</span><button type="button" class="secondary" data-student-assign>分配/调整宿舍</button></div>`:'';
  if(roleCode==='DORM_MANAGER'){
   const assigned=await api('/admin/users?roleCode=DORM_MANAGER');
   const occupied=new Set(assigned.filter(x=>!row||Number(x.user_id)!==Number(row.user_id)).flatMap(x=>(x.manager_buildings||'').split(',').map(name=>name.trim())));
   const availableBuildings=(state.data.buildings||[]).filter(x=>!occupied.has(x.building_name)||person?.buildingIds?.map(Number).includes(Number(x.building_id)));
   roleFields=field('employeeNo','工号','text',row?.employee_no||'')+field('hireDate','入职时间','date',row?.hire_date||'',false)+check('onDuty','在岗',row?!!row.manager_on_duty:true)+select('buildingId','负责楼栋',[['','暂不分配'],...availableBuildings.map(x=>[x.building_id,x.building_name])],person?.buildingIds?.[0]||'',false,false);
  }
  const editGridClass=roleCode==='STUDENT'?'edit-grid student-edit-grid':'edit-grid';
  const dialog=modal(row?'编辑人员资料':`新增${roleCode==='STUDENT'?'学生':roleCode==='DORM_MANAGER'?'宿管':'维修人员'}`,`<div class="${editGridClass}">${account}${password}${personal}${roleFields}${accommodationAction}</div>`,(d,form)=>{d.roleCode=roleCode;d.onDuty=!!d.onDuty;if(roleCode==='REPAIRER'){d.workTypeIds=checkedValues(form,'workTypeIds');d.buildingIds=checkedValues(form,'buildingIds');}return row?put('/admin/users/'+id,d):post('/admin/users',d);});
  bindChoiceDropdown(dialog);
  const assignButton=dialog.querySelector('[data-student-assign]');if(assignButton)assignButton.onclick=async()=>{const form=dialog.querySelector('form');if(!form.reportValidity())return;const draftData={...Object.fromEntries(new FormData(form)),stagedAccommodation:draft?.stagedAccommodation||null};state.data.studentEditDraft={userId:id,data:draftData};dialog.close();await assignmentDialog(row?Number(id):null,()=>adminAction('user-edit',id,{dataset:{}}),{userId:row?Number(id):'draft',bedId:draftData.bedId,student:{student_no:draftData.studentNo,real_name:draftData.realName,gender:draftData.gender},onSave:chosen=>{state.data.studentEditDraft={userId:id,data:{...draftData,bedId:String(chosen.bed_id),stagedAccommodation:chosen}};adminAction('user-edit',id,{dataset:{}});}});};
  if(roleCode==='STUDENT')bindAcademicEditor(dialog,state.data.academic,row,{departmentId:draft?.departmentId,majorId:draft?.majorId,grade:draft?.grade,classId:draft?.classId});
  if(draft){for(const [key,val] of Object.entries(draft)){const input=dialog.querySelector(`[name="${key}"]`);if(input&&input.type!=='checkbox')input.value=val;}}
  const numberField=dialog.querySelector('[name="studentNo"]');if(numberField){numberField.inputMode='numeric';numberField.pattern='[0-9]{10}';numberField.minLength=10;numberField.maxLength=10;numberField.title='固定为10位数字';}
  const employeeField=dialog.querySelector('[name="employeeNo"]');if(employeeField){const prefix=roleCode==='DORM_MANAGER'?'DM':roleCode==='REPAIRER'?'RP':'SA';employeeField.pattern=`${prefix}[0-9]{6}`;employeeField.minLength=8;employeeField.maxLength=8;employeeField.title=`格式：${prefix}加6位数字`;}
  return;
 }
 if(action==='user-detail'){const d=await api(`/admin/users/${id}`);let html=factGrid([['登录账号',d.login_account],['姓名',d.real_name],['角色',roleLabels[d.role_code]],['联系电话',d.phone],['性别',({MALE:'男',FEMALE:'女',OTHER:'其他'})[d.gender]||'未填写'],['生日',d.birth_date],...(d.role_code==='STUDENT'?[['学号',d.student_no],['学院',d.department_name],['专业',d.major_name],['年级',d.grade],['班级',d.class_name],['入学年份',d.enrollment_year],['学籍状态',({ENROLLED:'在读',SUSPENDED:'休学',GRADUATED:'毕业',WITHDRAWN:'退学',UNKNOWN:'未登记'})[d.enrollment_status]||'未登记']]:[['工号',d.employee_no],['入职时间',d.hire_date]]),['账号状态',Number(d.enabled)?'启用':'停用'],['账号创建时间',d.account_created_at||d.created_at],['资料更新时间',d.updated_at]]);
  if(d.role_code==='STUDENT'){const home=d.currentAccommodation?.[0];html+=`<section class="detail-section"><h3>当前住宿</h3>${home?factGrid([['楼栋',home.building_name],['房间',home.room_no],['床位',home.bed_no],['入住日期',home.check_in_date]]):'<p class="muted">尚未分配住宿</p>'}</section><div class="detail-record-actions">${recordButton('查看住宿历史','accommodationHistory')}${recordButton('查看报修记录','repairs')}${recordButton('查看留宿记录','stays')}</div>`;}
  if(d.role_code==='DORM_MANAGER')html+=`<section class="detail-section"><h3>负责楼栋</h3>${stacked(d.buildings.map(x=>x.building_name))}</section>`;
  if(d.role_code==='REPAIRER')html+=factGrid([['在岗状态',Number(d.profile.on_duty)?'在岗':'离岗'],['最大在办工单',d.profile.max_active_orders??'不限'],['维修工种',stacked(d.workTypes.map(x=>x.work_type_name))],['负责楼栋',stacked(d.buildings.map(x=>x.building_name))]])+`<div class="detail-record-actions">${recordButton('查看历史维修与评价','repairs')}</div>`;
  const dialog=modal(`${roleLabels[d.role_code]}详情`,`<div class="user-detail-content">${html}</div>`,null);bindDetailRecords(dialog,d,html);return;}
 if(action==='user-toggle'){const row=state.data.users.find(x=>String(x.user_id)===id);await put(`/admin/users/${id}/enabled`,{enabled:!row.enabled});await render();notify('账号状态已更新');return;}
 if(action==='user-delete'){modal('删除或停用账号','有业务历史的账号将停用并保留记录；没有业务记录的账号会被删除。',async()=>{const deleted=await api(`/admin/users/${id}`,{method:'DELETE'});return deleted?'账号已删除':'账号存在业务记录，已停用并保留历史';},'确认');return;}
 if(action==='manager-scope'){await managerScopeDialog(id);return;}
 if(action==='resource-new'||action==='resource-edit'){const type=action==='resource-new'?id:b.dataset.type;const row=action==='resource-edit'?state.data[type].find(x=>String(x[{buildings:'building_id',rooms:'room_id',beds:'bed_id'}[type]])===id):{};let html='';if(type==='buildings')html=field('buildingCode','楼栋编号','text',row.building_code||'')+field('buildingName','楼栋名称','text',row.building_name||'')+field('address','地址','text',row.address||'')+select('genderLimit','性别限制',[['男生','男生'],['女生','女生'],['混合','混合']],row.gender_limit);if(type==='rooms'){const building=state.data.buildings.find(x=>Number(x.building_id)===Number(row.building_id));const genderOptions=building?.gender_limit==='混合'?[['男生','男生'],['女生','女生']]:[[building?.gender_limit||'男生',building?.gender_limit||'男生']];const buildingField=action==='resource-edit'?field('buildingName','所属楼栋','text',row.building_name||'',false).replace('<input ','<input readonly '):select('buildingId','楼栋',state.data.buildings.map(x=>[x.building_id,x.building_name]),'',false,true);html=buildingField+field('roomNo','房间号','text',row.room_no||'')+field('floorNo','楼层','number',row.floor_no||1)+field('designCapacity','容量','number',row.design_capacity||4)+select('genderLimit','宿舍性别',genderOptions,row.gender_limit||genderOptions[0][0]);}if(type==='beds')html=select('roomId','房间',state.data.rooms.map(x=>[x.room_id,`${x.building_name} ${x.room_no}`]),row.room_id)+field('bedNo','床位编号','text',row.bed_no||'')+select('managementStatus','管理状态',[['AVAILABLE','可分配'],['DISABLED','停用']],row.management_status);const dialog=modal(`${action==='resource-edit'?'编辑':'新增'}${resourceConfig[type].title}`,html,d=>action==='resource-edit'?put(`/admin/resources/${type}/${id}`,d):post(`/admin/resources/${type}`,d));if(type==='rooms'&&action==='resource-new'){const form=dialog.querySelector('form'),buildingField=form.elements.buildingId,genderField=form.elements.genderLimit;buildingField.onchange=()=>{const selected=state.data.buildings.find(x=>String(x.building_id)===buildingField.value),options=selected?.gender_limit==='混合'?[['男生','男生'],['女生','女生']]:[[selected?.gender_limit||'男生',selected?.gender_limit||'男生']];refillSelect(genderField,'',options,options[0][0]);};}return;}
 if(action==='rule-edit'){const r=state.data.config.rule;modal('发布工单规则版本',[['accept_minutes','接单时限（分钟）'],['normal_minutes','普通维修时限（分钟）'],['urgent_minutes','紧急维修时限（分钟）'],['confirm_days','自动确认（天）'],['edit_days','待修改关闭（天）'],['max_rework_count','重修上限（空值为不限）']].map(([key,label])=>field(key,label,'number',r[key]??'',key!=='max_rework_count')).join(''),d=>post('/admin/repair-rules',d));return;}
 if(action==='worker-edit'){await repairerScopeDialog(id);return;}
 if(action==='student-assign'){await assignmentDialog();return;}
 if(action==='dictionary-new'||action==='dictionary-edit'){const type=action==='dictionary-new'?id:b.dataset.type;const rows=type==='work-types'?state.data.config.workTypes:state.data.config.categories;const row=action==='dictionary-edit'?rows.find(x=>String(x[type==='work-types'?'work_type_id':'category_id'])===id):{};modal(type==='work-types'?'维修工种':'故障分类',(type==='work-types'&&action==='dictionary-new'?field('code','工种编号'):'')+field('name','名称','text',row.work_type_name||row.category_name||'')+(type==='categories'?select('workTypeId','维修工种',state.data.config.workTypes.map(x=>[x.work_type_id,x.work_type_name]),row.work_type_id):'')+check('enabled','启用',row.enabled!==0),d=>{d.enabled=!!d.enabled;return action==='dictionary-new'?post(`/admin/dictionaries/${type}`,d):put(`/admin/dictionaries/${type}/${id}`,d);});return;}
 if(action==='import'){const examples={users:[{account:'student2',studentNo:'20260002',gender:'FEMALE',password:'123456',realName:'李同学',phone:'13800000000',roleCode:'STUDENT'}],buildings:[{buildingCode:'D-04',buildingName:'四号楼',address:'北区',genderLimit:'混合'}],rooms:[{buildingId:1,roomNo:'501',floorNo:5,designCapacity:4}],beds:[{roomId:1,bedNo:'E',managementStatus:'AVAILABLE'}],assignments:[{studentId:1,bedId:2}]};const dialog=modal('批量导入',`<button type="button" class="secondary" id="import-template">下载模板</button><label class="field"><span>JSON 数据文件</span><input name="importFile" type="file" accept="application/json,.json" required></label>`,async(d,f)=>{const form=new FormData();form.set('file',f.elements.importFile.files[0]);const file=await api('/admin/task-files',{method:'POST',body:form});await post('/admin/data-tasks',{taskType:'IMPORT',businessType:id,fileId:file.fileId});},'创建导入任务');dialog.querySelector('#import-template').onclick=()=>download(id+'-template.json',examples[id]);return;}
 if(action==='backup'){await post('/admin/backup-tasks',{taskType:'BACKUP'});await render();notify('备份任务已受理');return;}
 if(action==='refresh-tasks'){await render();return;}
 if(action==='task-cancel'){await api('/admin/data-tasks/'+id,{method:'DELETE'});await render();return;}
 if(action==='task-download'){const response=await fetch(`${API}/files/${id}`,{headers:{Authorization:`Bearer ${state.token}`}});if(!response.ok)throw new Error('下载失败');download(b.dataset.name||'export.json',await response.text(),'application/octet-stream');return;}
 if(action==='task-detail'){const task=await api('/admin/data-tasks/'+id);const dialog=modal('任务详情',`<p>${esc(task.task_status)}</p><p>${esc(task.result_description||'')}</p>${task.files.filter(f=>f.file_purpose==='OUTPUT').map(f=>button('下载结果','task-download',f.file_id,`data-name="${esc(f.original_name)}"`)).join('')}`,null);dialog.querySelectorAll('[data-action]').forEach(btn=>btn.onclick=()=>adminAction('task-download',btn.dataset.id,btn));return;}
}
