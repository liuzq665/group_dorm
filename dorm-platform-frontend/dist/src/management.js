import {API,api,post,put,role,state,esc,button,field,select,check,table,modal,render,notify,download,selectedRows,selectableRowsTable,statuses,bindTablePagination,filterTableComponents} from './app.js';

function historyDateRange(label,fromName,toName,filters){return `<div class="field range-field date-range-field"><span>${label}</span><div class="range-control"><input type="date" name="${fromName}" value="${esc(filters[fromName]||'')}" aria-label="${label}开始日期"><span aria-hidden="true">至</span><input type="date" name="${toName}" value="${esc(filters[toName]||'')}" aria-label="${label}结束日期"></div></div>`;}
function accommodationHistoryFilterForm(rows,filters){
 const buildingRows=rows.filter(row=>!filters.buildingName||row.building_name===filters.buildingName);
 const roomRows=buildingRows.filter(row=>!filters.roomNo||row.room_no===filters.roomNo);
 const rooms=unique(buildingRows.map(row=>row.room_no));
 const beds=unique(roomRows.map(row=>row.bed_no));
 const filterSelect=(name,label,values,selected,all)=>select(name,label,[['',all],...values.map(value=>[value,value])],selected||'',false,false).replace('<select ','<select data-history-filter ');
 return `<form id="accommodation-history-filter-form" class="filter-grid history-filter-grid"><label class="field"><span>姓名</span><input name="studentName" type="search" value="${esc(filters.studentName||'')}"></label>${filterSelect('buildingName','楼栋',unique(rows.map(row=>row.building_name)),filters.buildingName,'全部楼栋')}${filterSelect('roomNo','宿舍',rooms,filters.roomNo,'全部宿舍')}${filterSelect('bedNo','床位',beds,filters.bedNo,'全部床位')}${historyDateRange('入住日期范围','checkInFrom','checkInTo',filters)}${historyDateRange('退宿日期范围','checkOutFrom','checkOutTo',filters)}<div class="filter-actions"><button class="primary" type="submit">查询</button>${button('清空筛选','accommodation-history-filter-reset')}</div></form>`;
}
function filterAccommodationHistory(rows,filters){
 const name=String(filters.studentName||'').trim().toLowerCase();
 const inRange=(value,from,to)=>{const date=String(value||'').slice(0,10);return (!from&&!to)||(!!date&&(!from||date>=from)&&(!to||date<=to));};
 return rows.filter(row=>(!name||String(row.student_name||'').toLowerCase().includes(name))&&(!filters.buildingName||row.building_name===filters.buildingName)&&(!filters.roomNo||String(row.room_no)===String(filters.roomNo))&&(!filters.bedNo||String(row.bed_no)===String(filters.bedNo))&&inRange(row.check_in_date,filters.checkInFrom,filters.checkInTo)&&inRange(row.check_out_date,filters.checkOutFrom,filters.checkOutTo));
}
export function cascadeAccommodationHistoryFilters(form,changedName){
 const rows=state.data.accommodationHistoryRowsByPage?.[state.page]||[];
 if(changedName==='buildingName'){form.elements.roomNo.value='';form.elements.bedNo.value='';}
 if(changedName==='roomNo')form.elements.bedNo.value='';
 const buildingName=form.elements.buildingName.value,roomNo=form.elements.roomNo.value;
 const buildingRows=rows.filter(row=>!buildingName||row.building_name===buildingName);
 const roomRows=buildingRows.filter(row=>!roomNo||String(row.room_no)===roomNo);
 refillSelect(form.elements.roomNo,'全部宿舍',unique(buildingRows.map(row=>row.room_no)).map(value=>[value,value]),form.elements.roomNo.value);
 refillSelect(form.elements.bedNo,'全部床位',unique(roomRows.map(row=>row.bed_no)).map(value=>[value,value]),form.elements.bedNo.value);
}
function accommodationHistoryPage(rows,{studentName='',returnToStudents=false}={}){
 const pageKey=state.page,filters=state.data.accommodationHistoryFilters?.[pageKey]||{};
 const filtered=filterAccommodationHistory(rows,filters);
 state.data.accommodationHistoryRowsByPage??={};state.data.accommodationHistoryRowsByPage[pageKey]=rows;state.data.accommodationHistoryExportRows=filtered;
 const back=returnToStudents?button('返回学生管理','student-accommodation-history-back'):'';
 return `<section class="panel"><div class="toolbar"><h3>住宿历史</h3><div class="actions">${back}${button('批量导出','export-accommodation-history')}</div></div>${studentName?`<p class="muted history-student-name">学生：${esc(studentName)}</p>`:''}${accommodationHistoryFilterForm(rows,filters)}<div class="resource-result-count">共 ${filtered.length} 条</div>${selectableRowsTable(filtered,[['student_no','学号'],['student_name','姓名'],['login_account','账号'],['building_name','楼栋'],['room_no','宿舍'],['bed_no','床位'],['check_in_date','入住日期'],['check_out_date','退宿日期']],null,'assignment_id',`accommodation-history-${pageKey}`)}</section>`;
}

export const adminPages={
 async accommodationHistory(){
  const rows=await api('/accommodations/history');
  return accommodationHistoryPage(rows);
 },
 async studentAccommodationHistory(){
  const studentIds=state.data.studentAccommodationHistoryStudentIds||[];
  const selectedIds=new Set(studentIds.map(Number));
  const history=await api('/accommodations/history');
  const rows=selectedIds.size?history.filter(row=>selectedIds.has(Number(row.student_id))):history;
  const studentName=studentIds.length===1?state.data.studentAccommodationHistoryStudentNames?.[0]||'':studentIds.length?`已选 ${studentIds.length} 名学生`:'';
  return accommodationHistoryPage(rows,{studentName,returnToStudents:true});
 },
 async accommodation(){
  const rows=await api('/accommodations/current');state.data.homes=rows;
  if(role()==='ADMIN'){
   const academic=await api('/admin/academic-structure');state.data.academic=academic;
   const filters=state.data.homeFilters||{},filtered=filterAccommodationRows(rows,filters);state.data.homeExportRows=filtered;
   return `<section class="panel"><div class="toolbar"><h3>当前住宿</h3><div class="actions">${button('分配/调整床位','assign')}${button('住宿历史','accommodation-history')}${button('批量导出','export-homes')}</div></div>${accommodationFilterForm(rows,academic,filters)}<div class="resource-result-count">共 ${filtered.length} 条</div>${selectableRowsTable(filtered,[['student_no','学号'],['student_name','姓名'],['login_account','账号'],['department_name','学院'],['major_name','专业'],['grade_label','年级/班级'],['current_accommodation','当前住宿'],['check_in_date','入住日期']],r=>button('退宿','checkout',r.assignment_id),'assignment_id','accommodation-current')}</section>`;
  }
  let roommates='';if(role()==='STUDENT')roommates=`<section class="panel"><h3>舍友</h3>${table(await api('/accommodations/roommates'),[['student_name','姓名'],['bed_no','床位']])}</section>`;
  return `<section class="panel"><div class="toolbar"><h3>当前住宿</h3><div class="actions">${button('批量导出','export-homes')}</div></div>${selectableRowsTable(rows,[['student_name','学生'],['building_name','楼栋'],['room_no','房间'],['bed_no','床位'],['check_in_date','入住日期']],null,'assignment_id','accommodation-current')}</section>${roommates}`;
 },
 async buildings(){const [buildings,rooms,beds]=await Promise.all([api('/buildings'),api('/rooms'),api('/beds')]);Object.assign(state.data,{buildings,rooms,beds});return [['buildings','楼栋',buildings,[['building_code','编号'],['building_name','名称'],['address','地址'],['gender_limit','性别'],['bed_count','床位'],['occupied_count','入住']],'building_id'],['rooms','宿舍',rooms,[['building_name','楼栋'],['room_no','房间'],['floor_no','楼层'],['design_capacity','容量']],'room_id'],['beds','床位',beds,[['building_name','楼栋'],['room_no','房间'],['bed_no','床位'],['management_status','管理状态'],['student_name','学生']],'bed_id']].map(([key,title,rows,columns,idKey])=>`<section class="panel"><div class="toolbar"><h3>${title}</h3><div class="actions">${role()==='ADMIN'?button('新增'+title,'resource-new',key):''}${button('批量导出','resource-export',key)}</div></div>${selectableRowsTable(rows,columns,r=>role()==='ADMIN'?button('编辑','resource-edit',r[idKey],`data-type="${key}"`):'',idKey,key)}</section>`).join('');},
 async buildings(){if(role()==='ADMIN')return basicResourcePage('buildings');const rows=await api('/buildings');state.data.buildings=rows;return `<section class="panel"><h3>负责楼栋</h3>${table(rows,[['building_code','编号'],['building_name','名称'],['address','地址'],['gender_limit','性别限制'],['room_count','宿舍数'],['bed_count','总床位'],['available_bed_count','空闲床位']])}</section>`;},
 async rooms(){return basicResourcePage('rooms');},
 async beds(){return basicResourcePage('beds');},
 async students(){[state.data.academic,state.data.buildings,state.data.beds,state.data.rooms]=await Promise.all([api('/admin/academic-structure'),api('/buildings'),api('/beds'),api('/rooms')]);return userDirectory('students','学生管理','STUDENT');},
 async managers(){state.data.buildings=await api('/buildings');return userDirectory('managers','宿管管理','DORM_MANAGER');},
 async repairers(){[state.data.config,state.data.buildings]=await Promise.all([api('/admin/repair-config'),api('/buildings')]);return userDirectory('repairers','维修人员管理','REPAIRER');},
 async logs(){const f=state.data.logFilters||{},q=new URLSearchParams(Object.entries(f).filter(([,v])=>v)),modules=[['','全部模块'],['auth','认证'],['dorm','宿舍管理'],['notice','通知'],['repair','报修'],['stay','留宿'],['system','系统管理']],roles=[['','全部角色'],['STUDENT','学生'],['DORM_MANAGER','宿管'],['REPAIRER','维修人员'],['ADMIN','系统管理员']],rows=await api('/admin/operation-logs'+(q.size?'?'+q:''));return `<section class="panel"><div class="toolbar"><h3>操作日志</h3>${button('批量删除','log-delete-selected')}</div><form id="log-filter-form" class="filter-grid">${select('role','操作角色',roles,f.role||'',false,false)}${field('operator','操作人','search',f.operator||'',false)}${select('module','模块',modules,f.module||'',false,false)}${field('from','开始日期','date',f.from||'',false)}${field('to','结束日期','date',f.to||'',false)}<div class="filter-actions"><button class="primary">查询</button><button type="reset" class="secondary" data-filter-clear="log-filter-form">清空</button></div></form>${selectableAdminTable(rows,[['role_label','操作角色'],['real_name','操作人'],['module_label','模块'],['action','动作'],['business_id','业务编号'],['result','结果'],['occurred_at','时间']],r=>button('查看','log-detail',r.log_id)+button('删除','log-delete',r.log_id),'log_id','logs')}</section>`;},
 async rules(){const config=await api('/admin/repair-config');state.data.config=config;return `<section class="panel"><div class="toolbar"><h3>工单规则</h3>${button('发布规则版本','rule-edit')}</div>${table([config.rule],[['accept_minutes','接单时限/分钟'],['normal_minutes','普通维修/分钟'],['urgent_minutes','紧急维修/分钟'],['confirm_days','超时自动确认/天'],['max_rework_count','重修上限']])}</section><section class="rule-dictionaries"><section class="panel"><div class="toolbar"><h3>维修工种</h3>${button('新增工种','dictionary-new','work-types')}</div><div class="rules-table-fixed">${table(config.workTypes,[['work_type_code','编号'],['work_type_name','名称'],['enabled_toggle','启用']],r=>button('编辑','dictionary-edit',r.work_type_id,'data-type="work-types"')+button('删除','dictionary-delete',r.work_type_id,'data-type="work-types"'),'work_type_id',5)}</div></section><section class="panel"><div class="toolbar"><h3>故障分类</h3>${button('新增分类','dictionary-new','categories')}</div><div class="rules-table-fixed">${table(config.categories,[['category_name','分类名称'],['work_type_id','工种编号'],['enabled_toggle','启用']],r=>button('编辑','dictionary-edit',r.category_id,'data-type="categories"')+button('删除','dictionary-delete',r.category_id,'data-type="categories"'),'category_id',5)}</div></section></section>`;},
 async data(){const backups=await api('/admin/backup-tasks');state.data.backups=backups;return `<section class="panel"><div class="toolbar"><h3>数据备份</h3><div class="actions">${button('批量下载','backup-download-selected')}${button('批量删除','backup-delete-selected')}</div></div><div class="actions section-gap">${[['roles','角色管理'],['repairs','报修管理'],['stays','留宿管理'],['dorm','宿舍管理']].map(([type,label])=>button(`备份${label}`,'backup',type)).join('')}</div>${selectableAdminTable(backups,[['backup_domain','备份范围'],['task_status','状态'],['result_description','结果'],['finished_at','完成时间']],r=>(r.file_id?button('下载 SQL','task-download',r.file_id,`data-name="${esc(r.file_name||'dorm-backup.sql')}"`):'<button type="button" class="secondary backup-unavailable" disabled>无法下载</button>')+button('删除','backup-delete',r.task_id),'task_id','backups')}</section>`;}
};
const resourceConfig={
 buildings:{title:'楼栋',id:'building_id',columns:[['building_code','编号'],['building_name','名称'],['address','地址'],['gender_limit','性别限制'],['room_count','宿舍数'],['bed_count','总床位'],['available_bed_count','空闲床位']],filterNames:['keyword','genderLimit','minBeds','maxBeds','minFreeBeds','maxFreeBeds']},
 rooms:{title:'宿舍',id:'room_id',columns:[['building_name','楼栋'],['room_no','宿舍号'],['floor_no','楼层'],['gender_limit','性别限制'],['bed_count','床位数'],['available_bed_count','空闲床位']],filterNames:['buildingId','roomId','floorNo','genderLimit','minBeds','maxBeds','minFreeBeds','maxFreeBeds']},
 beds:{title:'床位',id:'bed_id',columns:[['building_name','楼栋'],['floor_no','楼层'],['room_no','宿舍号'],['bed_no','床位号'],['bed_status_label','床位状态'],['student_name','入住学生']],filterNames:['buildingId','floorNo','roomId','bedNo','genderLimit','studentName','bedStatus']}
};
function accommodationFilterForm(rows,academic,filters){
 const buildings=[...new Map(rows.map(row=>[String(row.building_id),[row.building_id,row.building_name]])).values()];
 const roomRows=rows.filter(row=>!filters.buildingId||String(row.building_id)===String(filters.buildingId));
 const rooms=[...new Map(roomRows.map(row=>[String(row.room_id),[row.room_id,`${row.building_name} / ${row.room_no}`]])).values()];
 const selectedDepartment=filters.departmentId||'';
 const majorRows=academic.majors.filter(row=>!selectedDepartment||String(row.department_id)===String(selectedDepartment));
 const selectedMajor=filters.majorId||'';
 const majorIds=new Set(majorRows.map(row=>String(row.major_id)));
 const classRows=academic.classes.filter(row=>majorIds.has(String(row.major_id))&&(!selectedMajor||String(row.major_id)===String(selectedMajor))&&(!filters.grade||String(row.enrollment_year)===String(filters.grade)));
 const grades=unique(classRows.map(row=>row.enrollment_year));
 return `<form id="accommodation-filter-form" class="filter-grid accommodation-filter-grid">${field('keyword','学生查询（姓名、学号、账号、电话）','search',filters.keyword||'',false)}${select('buildingId','楼栋',[['','全部楼栋'],...buildings],filters.buildingId||'',false,false)}${select('roomId','宿舍',[['','全部宿舍'],...rooms],filters.roomId||'',false,false)}${select('departmentId','学院',[['','全部学院'],...academic.departments.map(row=>[row.department_id,row.department_name])],selectedDepartment,false,false)}${select('majorId','专业',[['','全部专业'],...majorRows.map(row=>[row.major_id,row.major_name])],selectedMajor,false,false)}${select('grade','年级',[['','全部年级'],...grades.map(value=>[value,`${value}级`])],filters.grade||'',false,false)}${select('classId','班级',[['','全部班级'],...classRows.map(row=>[row.class_id,row.class_name])],filters.classId||'',false,false)}<div class="filter-actions"><button class="primary" type="submit">查询</button>${button('清空','accommodation-filter-reset')}</div></form>`;
}
function filterAccommodationRows(rows,filters){
 const keyword=String(filters.keyword||'').trim().toLowerCase();
 return rows.filter(row=>(!keyword||[row.student_name,row.student_no,row.login_account,row.phone].some(value=>String(value||'').toLowerCase().includes(keyword)))&&(!filters.buildingId||String(row.building_id)===String(filters.buildingId))&&(!filters.roomId||String(row.room_id)===String(filters.roomId))&&(!filters.departmentId||String(row.department_id)===String(filters.departmentId))&&(!filters.majorId||String(row.major_id)===String(filters.majorId))&&(!filters.grade||String(row.enrollment_year)===String(filters.grade))&&(!filters.classId||String(row.class_id)===String(filters.classId))).map(row=>({...row,grade_label:[row.enrollment_year?`${row.enrollment_year}级`:null,row.class_name].filter(Boolean).join(' '),current_accommodation:[row.building_name,row.room_no,row.bed_no].filter(Boolean).join(' / ')}));
}
export function cascadeAccommodationFilters(form,changedName){
 const academic=state.data.academic,filters=Object.fromEntries(new FormData(form)),building=form.elements.buildingId,room=form.elements.roomId;
 if(changedName==='buildingId'){room.value='';const rooms=state.data.homes.filter(row=>!building.value||String(row.building_id)===building.value);refillSelect(room,'全部宿舍',[...new Map(rooms.map(row=>[String(row.room_id),[row.room_id,`${row.building_name} / ${row.room_no}`]])).values()]);}
 if(changedName==='departmentId'){form.elements.majorId.value='';form.elements.grade.value='';form.elements.classId.value='';}
 if(changedName==='majorId'){form.elements.grade.value='';form.elements.classId.value='';}
 if(changedName==='grade')form.elements.classId.value='';
 if(['departmentId','majorId','grade'].includes(changedName)){
  const departmentId=form.elements.departmentId.value,majorId=form.elements.majorId.value,grade=form.elements.grade.value;
  const majors=academic.majors.filter(row=>!departmentId||String(row.department_id)===departmentId);
  refillSelect(form.elements.majorId,'全部专业',majors.map(row=>[row.major_id,row.major_name]),majorId);
  const majorIds=new Set(majors.map(row=>String(row.major_id)));
  const classes=academic.classes.filter(row=>majorIds.has(String(row.major_id))&&(!majorId||String(row.major_id)===majorId)&&(!grade||String(row.enrollment_year)===grade));
  refillSelect(form.elements.grade,'全部年级',unique(classes.map(row=>row.enrollment_year)).map(value=>[value,`${value}级`]),grade);
  refillSelect(form.elements.classId,'全部班级',classes.map(row=>[row.class_id,row.class_name]));
 }
}
async function basicResourcePage(type){
 const [buildings,rooms,beds]=await Promise.all([api('/buildings'),api('/rooms'),api('/beds')]);Object.assign(state.data,{buildings,rooms,beds});
 const config=resourceConfig[type],filters=state.data.resourceFilters?.[type]||{},rows=filterResourceRows(type,state.data[type],filters);state.data.resourceExportRows??={};state.data.resourceExportRows[type]=rows;
 const filterForm=resourceFilterForm(type,filters,buildings,rooms);
 const actions=row=>button('详情','resource-detail',row[config.id],`data-type="${type}"`)+button('编辑','resource-edit',row[config.id],`data-type="${type}"`)+button('删除','resource-delete',row[config.id],`data-type="${type}"`);
 const tools=button('新增'+config.title,'resource-new',type)+button('批量导入','import',type)+button('批量删除','resource-delete-selected',type)+button('批量导出','resource-export',type);
 const displayRows=type==='beds'?rows.map(row=>({...row,bed_status_label:bedStatusLabel(row)})):rows;
 return `<section class="panel"><div class="toolbar"><h3>${config.title}管理</h3><div class="actions">${tools}</div></div>${filterForm}<div class="resource-result-count">共 ${rows.length} 条</div>${resourceSelectableTable(displayRows,config.columns,actions,type,config.id)}</section>`;
}
function resourceFilterForm(type,filters,buildings,rooms){
 const pick=(name,label,items)=>select(name,label,items,filters[name]||'',false,false);
 const range=(lowName,highName,label,low,high)=>`<div class="field range-field"><span>${label}</span><div class="range-control"><input name="${lowName}" type="number" min="0" value="${esc(low||'')}" placeholder="自定最低值" aria-label="${label}自定最低值"><span aria-hidden="true">—</span><input name="${highName}" type="number" min="0" value="${esc(high||'')}" placeholder="自定最高值" aria-label="${label}自定最高值"></div></div>`;
 const floorRows=unique(rooms.filter(x=>!filters.buildingId||String(x.building_id)===String(filters.buildingId)).map(x=>x.floor_no)).sort((a,b)=>Number(a)-Number(b));
 const roomRows=rooms.filter(x=>(!filters.buildingId||String(x.building_id)===String(filters.buildingId))&&(!filters.floorNo||String(x.floor_no)===String(filters.floorNo)));
 const roomItems=roomRows.map(x=>[x.room_id,filters.buildingId?x.room_no:`${x.building_name} · ${x.room_no}`]);
 const keyword=field('keyword','名称或编号','search',filters.keyword||'',false);
 let fields=keyword;
 if(type==='buildings')fields+=pick('genderLimit','性别限制',[['','全部'],['男生','男生'],['女生','女生'],['混合','混合']])+range('minBeds','maxBeds','总床位范围',filters.minBeds,filters.maxBeds)+range('minFreeBeds','maxFreeBeds','空闲床位范围',filters.minFreeBeds,filters.maxFreeBeds);
 if(type==='rooms')fields=pick('buildingId','楼栋',[['','全部楼栋'],...buildings.map(x=>[x.building_id,x.building_name])])+pick('roomId','宿舍',[['','全部宿舍'],...roomItems])+pick('floorNo','楼层',[['','全部楼层'],...floorRows.map(x=>[x,`${x}层`])])+pick('genderLimit','性别限制',[['','全部'],['男生','男生'],['女生','女生']])+range('minBeds','maxBeds','床位数范围',filters.minBeds,filters.maxBeds)+range('minFreeBeds','maxFreeBeds','空闲床位范围',filters.minFreeBeds,filters.maxFreeBeds);
 if(type==='beds')fields=pick('buildingId','楼栋',[['','全部楼栋'],...buildings.map(x=>[x.building_id,x.building_name])])+pick('roomId','宿舍',[['','全部宿舍'],...roomItems])+pick('floorNo','楼层',[['','全部楼层'],...floorRows.map(x=>[x,`${x}层`])])+pick('bedNo','床位号',[['','全部床位号'],...unique(bedsForBuildingRoom(buildings,rooms,filters).map(x=>x.bed_no)).map(x=>[x,x])])+pick('genderLimit','性别限制',[['','全部'],['男生','男生'],['女生','女生']])+field('studentName','学生姓名','search',filters.studentName||'',false)+pick('bedStatus','床位状态',[['','全部状态'],['AVAILABLE','可分配'],['OCCUPIED','已入住'],['DISABLED','停用']]);
 return `<form class="filter-grid resource-filter-grid" data-resource-filter="${type}">${fields}<div class="filter-actions"><button class="primary" type="submit">查询</button>${button('清空筛选','resource-filter-reset',type)}</div></form>`;
}
function bedsForBuildingRoom(buildings,rooms,filters){
 const selectedRoom=rooms.find(x=>String(x.room_id)===String(filters.roomId));
 const selectedBuilding=buildings.find(x=>String(x.building_id)===String(filters.buildingId));
 return (state.data.beds||[]).filter(x=>(!selectedRoom||Number(x.room_id)===Number(selectedRoom.room_id))&&(!selectedBuilding||Number(x.building_id)===Number(selectedBuilding.building_id))&&(!filters.floorNo||Number(x.floor_no)===Number(filters.floorNo)));
}
function filterResourceRows(type,rows,filters){
 const text=(...values)=>values.some(value=>String(value||'').toLowerCase().includes(String(filters.keyword||'').trim().toLowerCase()));
 const within=(value,min,max)=>(!min||Number(value)>=Number(min))&&(!max||Number(value)<=Number(max));
 return rows.filter(row=>{
  if(filters.keyword&&!text(type==='buildings'?[row.building_code,row.building_name,row.address]:[row.room_no,row.building_name]))return false;
  if(type==='buildings')return(!filters.genderLimit||row.gender_limit===filters.genderLimit)&&within(row.bed_count,filters.minBeds,filters.maxBeds)&&within(row.available_bed_count,filters.minFreeBeds,filters.maxFreeBeds);
  if(type==='rooms')return(!filters.buildingId||String(row.building_id)===String(filters.buildingId))&&(!filters.floorNo||Number(row.floor_no)===Number(filters.floorNo))&&(!filters.roomId||String(row.room_id)===String(filters.roomId))&&(!filters.genderLimit||row.gender_limit===filters.genderLimit)&&within(row.bed_count,filters.minBeds,filters.maxBeds)&&within(row.available_bed_count,filters.minFreeBeds,filters.maxFreeBeds);
  return(!filters.buildingId||String(row.building_id)===String(filters.buildingId))&&(!filters.floorNo||Number(row.floor_no)===Number(filters.floorNo))&&(!filters.roomId||String(row.room_id)===String(filters.roomId))&&(!filters.genderLimit||row.room_gender_limit===filters.genderLimit)&&(!filters.bedNo||row.bed_no===filters.bedNo)&&(!filters.studentName||String(row.student_name||'').toLowerCase().includes(String(filters.studentName).trim().toLowerCase()))&&(!filters.bedStatus||bedStatusCode(row)===filters.bedStatus);
 });
}
function bedStatusCode(row){return row.management_status==='DISABLED'?'DISABLED':row.student_id?'OCCUPIED':'AVAILABLE';}
function bedStatusLabel(row){return {DISABLED:'停用',OCCUPIED:'已入住',AVAILABLE:'可分配'}[bedStatusCode(row)];}
function resourceSelectableTable(rows,columns,actions,type,idKey){
 return table(rows,columns,actions,idKey).replace('<thead><tr>','<thead><tr><th class="select-col"><input type="checkbox" data-resource-select-all aria-label="全选"></th>')
  .replace(/(<tr data-row-id="([^"]*)"[^>]*>)/g,(_,row,id)=>`${row}<td class="select-col"><input type="checkbox" data-resource-select-row value="${id}" aria-label="选择记录"></td>`)
  .replace('<div class="table-wrap table-component"',`<div class="table-wrap table-component resource-table" data-resource-type="${type}"`);
}
function roomBedsTable(beds){return table(beds,[['bed_no','床位号'],['student_no','学号'],['student_name','姓名'],['grade','年级'],['major_name','专业']],null,'bed_id');}
function roomBedsSection(beds){return `<section class="detail-section"><div class="toolbar"><h3>床位与入住学生</h3><button type="button" class="secondary" data-room-occupants>调整入住学生</button></div><div data-room-beds-summary>${roomBedsTable(beds)}</div></section>`;}
function resourceDetail(type,id){
 const config=resourceConfig[type],row=state.data[type].find(x=>String(x[config.id])===String(id));if(!row)return;
 let facts=[];let extra='';
 if(type==='buildings'){
  facts=[['编号',row.building_code],['名称',row.building_name],['地址',row.address],['性别限制',row.gender_limit],['总床位',row.bed_count],['空闲床位',row.available_bed_count]];
  extra=buildingRoomsPanel(id,false);
 }
 if(type==='rooms'){
  facts=[['楼栋',row.building_name],['楼层',row.floor_no],['宿舍号',row.room_no],['性别限制',row.gender_limit],['床位数',row.bed_count],['空闲床位',row.available_bed_count]];
  const beds=state.data.beds.filter(x=>Number(x.room_id)===Number(id));extra=roomBedsSection(beds);
 }
 if(type==='beds'){
  facts=[['楼栋',row.building_name],['楼层',row.floor_no],['宿舍号',row.room_no],['床位号',row.bed_no],['床位状态',bedStatusLabel(row)],['性别限制',row.room_gender_limit]];
  if(row.student_id)extra=`<section class="detail-section"><h3>学生基本信息</h3>${factGrid([['姓名',row.student_name],['学号',row.student_no],['性别',({MALE:'男',FEMALE:'女',OTHER:'其他'})[row.student_gender]||'未填写'],['学院',row.department_name],['专业',row.major_name],['年级',row.grade?`${row.grade}级`:null],['班级',row.class_name],['联系电话',row.student_phone],['生日',row.student_birth_date],['学籍状态',row.enrollment_status]])}</section>`;
 }
 const dialog=modal(`${config.title}详情`,`<div class="user-detail-content">${factGrid(facts)}${extra}</div>`,null);
 if(type==='buildings')bindBuildingRooms(dialog,Number(id),false);
 if(type==='rooms')dialog.querySelector('[data-room-occupants]')?.addEventListener('click',()=>roomOccupantsDialog(row));
}
function buildingRoomsPanel(buildingId,editable){
 const building=(state.data.buildings||[]).find(x=>Number(x.building_id)===Number(buildingId));
 const rooms=(state.data.rooms||[]).filter(x=>Number(x.building_id)===Number(buildingId));
 const floors=[...new Set(rooms.map(x=>x.floor_no).filter(x=>x!=null))].sort((a,b)=>Number(a)-Number(b));
 const roomGenderOptions=building?.gender_limit==='混合'?[['男生','男生'],['女生','女生']]:[[building?.gender_limit||'男生',building?.gender_limit||'男生']];
 const addRoom=editable?`<div class="building-room-create" hidden><div class="building-room-create-grid">${field('newRoomNo','宿舍号','text','',false)}${field('newRoomFloor','楼层','number','1',false)}${field('newRoomCapacity','容量','number','4',false)}${select('newRoomGender','宿舍性别',roomGenderOptions,roomGenderOptions[0][0],false,false)}<div class="actions building-room-create-actions"><button type="button" class="primary" data-building-room-save>保存宿舍</button><button type="button" class="secondary" data-building-room-cancel>取消</button></div></div></div>`:'';
 return `<section class="detail-section building-rooms-section" data-building-room-panel data-building-id="${buildingId}" data-editable="${editable}"><div class="toolbar"><h3 data-building-room-summary>楼栋宿舍（${rooms.length}）</h3></div><div class="toolbar"><div class="building-room-tools"><label class="building-floor-filter"><span>楼层</span><select data-building-floor-filter aria-label="按楼层筛选"><option value="">全部楼层</option>${floors.map(floor=>`<option value="${esc(floor)}">${esc(floor)}层</option>`).join('')}</select></label>${editable?'<button type="button" class="secondary" data-building-room-add>新增宿舍</button>':''}</div></div>${addRoom}<div data-building-room-table>${buildingRoomsTable(rooms,'',editable)}</div></section>`;
}
function buildingRoomsTable(rooms,floor='',editable=false){
 const rows=rooms.filter(x=>!floor||String(x.floor_no)===String(floor));
 const actions=editable?room=>`<button type="button" class="secondary" data-building-room-edit="${esc(room.room_id)}">编辑</button>`:null;
 return rows.length?table(rows,[['floor_no','楼层'],['room_no','宿舍号'],['gender_limit','性别限制'],['design_capacity','容量']],actions,'room_id',5).replace('<div class="table-wrap table-component"','<div class="table-wrap table-component building-room-table"'):'<div class="empty">暂无符合条件的宿舍</div>';
}
function buildingRoomEditorRow(room,genderOptions){
 return `<td><input type="number" min="1" step="1" value="${esc(room.floor_no)}" data-room-floor aria-label="楼层"></td><td><input type="text" value="${esc(room.room_no)}" data-room-no aria-label="宿舍号"></td><td><select data-room-gender aria-label="性别限制">${genderOptions.map(([value,label])=>`<option value="${esc(value)}" ${String(value)===String(room.gender_limit)?'selected':''}>${esc(label)}</option>`).join('')}</select></td><td><input type="number" min="1" step="1" value="${esc(room.design_capacity)}" data-room-capacity aria-label="容量"></td><td><div class="actions building-room-row-actions"><button type="button" class="primary" data-building-room-edit-save="${esc(room.room_id)}">保存</button><button type="button" class="secondary" data-building-room-edit-cancel>取消</button></div></td>`;
}
function bindBuildingRooms(dialog,buildingId,editable){
 const panel=dialog.querySelector('[data-building-room-panel]');if(!panel)return;
 const floor=panel.querySelector('[data-building-floor-filter]');
 const tableHost=panel.querySelector('[data-building-room-table]');
 const renderRooms=()=>{
  tableHost.innerHTML=buildingRoomsTable((state.data.rooms||[]).filter(x=>Number(x.building_id)===buildingId),floor.value,editable);
  bindTablePagination(dialog);
 };
 floor.onchange=()=>{
  renderRooms();
 };
 if(!editable)return;
 const form=dialog.querySelector('form'),create=panel.querySelector('.building-room-create');
 const building=(state.data.buildings||[]).find(x=>Number(x.building_id)===buildingId);
 const roomGenderOptions=building?.gender_limit==='混合'?[['男生','男生'],['女生','女生']]:[[building?.gender_limit||'男生',building?.gender_limit||'男生']];
 const addButton=panel.querySelector('[data-building-room-add]');
 const setActionsDisabled=disabled=>{floor.disabled=disabled;addButton.disabled=disabled;tableHost.querySelectorAll('[data-building-room-edit]').forEach(button=>button.disabled=disabled);};
 const resetCreateForm=()=>{form.elements.newRoomNo.value='';form.elements.newRoomFloor.value='1';form.elements.newRoomCapacity.value='4';form.elements.newRoomGender.value=roomGenderOptions[0][0];};
 const refreshResources=async selectedFloor=>{
  [state.data.buildings,state.data.rooms,state.data.beds]=await Promise.all([api('/buildings'),api('/rooms'),api('/beds')]);
  const buildingRooms=state.data.rooms.filter(x=>Number(x.building_id)===buildingId);
  const floors=[...new Set(buildingRooms.map(x=>x.floor_no).filter(x=>x!=null))].sort((a,b)=>Number(a)-Number(b));
  floor.innerHTML=`<option value="">全部楼层</option>${floors.map(value=>`<option value="${esc(value)}">${esc(value)}层</option>`).join('')}`;
  floor.value=floors.some(value=>String(value)===String(selectedFloor))?String(selectedFloor):'';
  panel.querySelector('[data-building-room-summary]').textContent=`楼栋宿舍（${buildingRooms.length}）`;
  renderRooms();
 };
 addButton.onclick=()=>{create.hidden=false;setActionsDisabled(true);};
 panel.querySelector('[data-building-room-cancel]').onclick=()=>{resetCreateForm();create.hidden=true;setActionsDisabled(false);};
 panel.querySelector('[data-building-room-save]').onclick=async event=>{
  const button=event.currentTarget,roomNo=form.elements.newRoomNo.value.trim(),floorNo=Number(form.elements.newRoomFloor.value),capacity=Number(form.elements.newRoomCapacity.value),genderLimit=form.elements.newRoomGender.value;
  if(!roomNo||!Number.isInteger(floorNo)||floorNo<1||!Number.isInteger(capacity)||capacity<1){notify('请填写有效的宿舍号、楼层和容量',true);return;}
  button.disabled=true;
  try{
   await post('/admin/resources/rooms',{buildingId,roomNo,floorNo,designCapacity:capacity,genderLimit});
   await refreshResources(floorNo);
   resetCreateForm();create.hidden=true;setActionsDisabled(false);notify('宿舍已新增');
  }catch(error){notify(error.message,true);}
  finally{button.disabled=false;}
 };
 tableHost.addEventListener('click',async event=>{
  const edit=event.target.closest('[data-building-room-edit]');
  if(edit){
   const room=(state.data.rooms||[]).find(x=>Number(x.room_id)===Number(edit.dataset.buildingRoomEdit));
   if(!room)return;
   edit.closest('tr').innerHTML=buildingRoomEditorRow(room,roomGenderOptions);
   setActionsDisabled(true);
   return;
  }
  if(event.target.closest('[data-building-room-edit-cancel]')){setActionsDisabled(false);renderRooms();return;}
  const save=event.target.closest('[data-building-room-edit-save]');
  if(!save)return;
  const roomId=Number(save.dataset.buildingRoomEditSave),row=save.closest('tr'),room=(state.data.rooms||[]).find(x=>Number(x.room_id)===roomId);
  if(!room)return;
  const roomNo=row.querySelector('[data-room-no]').value.trim(),floorNo=Number(row.querySelector('[data-room-floor]').value),capacity=Number(row.querySelector('[data-room-capacity]').value),genderLimit=row.querySelector('[data-room-gender]').value;
  if(!roomNo||!Number.isInteger(floorNo)||floorNo<1||!Number.isInteger(capacity)||capacity<1){notify('请填写有效的宿舍号、楼层和容量',true);return;}
  if(capacity<Number(room.bed_count)){notify('容量不能少于已建床位数',true);return;}
  save.disabled=true;
  try{
   await put(`/admin/resources/rooms/${roomId}`,{buildingId,roomNo,floorNo,designCapacity:capacity,genderLimit});
   await refreshResources(floorNo);setActionsDisabled(false);notify('宿舍信息已更新');
  }catch(error){notify(error.message,true);}
  finally{save.disabled=false;}
 });
}
function gradeLabel(value){const grade=String(value??'');return /^\d{4}$/.test(grade)?`${grade}级`:grade;}
function studentPickerTable(rows){
 const items=rows.map(row=>({...row,grade_label:gradeLabel(row.grade)}));
 return table(items,[['student_no','学号'],['real_name','姓名'],['grade_label','年级'],['major_name','专业']],row=>`<button type="button" class="secondary" data-student-choice="${esc(row.user_id)}">选择</button>`,'user_id',7).replace('<div class="table-wrap table-component"','<div class="table-wrap table-component student-picker-table"');
}
function studentPickerMarkup(students){
 const grades=unique(students.map(x=>x.grade).filter(Boolean));
 const majors=unique(students.map(x=>x.major_name).filter(Boolean));
 return `<section class="detail-section student-picker"><h3>选择学生</h3><div class="filter-grid student-picker-filter-grid">${field('pickerName','姓名','search','',false)}${field('pickerStudentNo','学号','search','',false)}${select('pickerGrade','年级',[['','全部年级'],...grades.map(x=>[x,gradeLabel(x)])],'',false,false)}${select('pickerMajor','专业',[['','全部专业'],...majors.map(x=>[x,x])],'',false,false)}<div class="filter-actions"><button type="button" class="primary" data-student-search>查询学生</button></div></div><div data-student-picker-results>${studentPickerTable(students)}</div></section>`;
}
function bindStudentPicker(dialog,students,onChoose,exclude=()=>false){
 const picker=dialog.querySelector('.student-picker');if(!picker)return()=>{};
 const results=picker.querySelector('[data-student-picker-results]');
 const refresh=()=>{
  const name=picker.querySelector('[name="pickerName"]').value.trim().toLowerCase();
  const studentNo=picker.querySelector('[name="pickerStudentNo"]').value.trim().toLowerCase();
  const grade=picker.querySelector('[name="pickerGrade"]').value,major=picker.querySelector('[name="pickerMajor"]').value;
  const rows=students.filter(x=>String(x.real_name||'').toLowerCase().includes(name)&&String(x.student_no||'').toLowerCase().includes(studentNo)&&(!grade||String(x.grade)===grade)&&(!major||String(x.major_name)===major)&&!exclude(x));
  results.innerHTML=rows.length?studentPickerTable(rows):'<div class="empty">没有符合条件的学生</div>';
  bindTablePagination(dialog);
 };
 picker.querySelector('[data-student-search]').onclick=refresh;
 picker.querySelectorAll('input,select').forEach(input=>input.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();refresh();}}));
 results.addEventListener('click',event=>{
  const button=event.target.closest('[data-student-choice]');if(!button)return;
  const student=students.find(x=>String(x.user_id)===button.dataset.studentChoice);if(student&&!exclude(student))onChoose(student);
 });
 return refresh;
}
function studentLabel(student){return student?[student.real_name,gradeLabel(student.grade),student.major_name].filter(Boolean).join(' · '):'';}
function studentsEligibleForRoom(room,students){
 return students.filter(student=>{
  const currentRoom=student.current_building===room.building_name&&String(student.current_room)===String(room.room_no);
  const assignable=!student.current_building&&Number(student.enabled)===1&&student.enrollment_status==='ENROLLED';
  return(currentRoom||assignable)&&genderMatches(student.gender,room.gender_limit);
 });
}
function roomOccupantsEditor(roomBeds,students){
 const beds=roomBeds.map(bed=>{
  const student=students.find(x=>Number(x.user_id)===Number(bed.student_id));
  return `<div class="room-occupant-choice" data-bed-choice="${bed.bed_id}"><label class="field"><span>${esc(bed.bed_no)}号床</span><input type="text" name="occupantDisplay_${bed.bed_id}" data-bed-target="${bed.bed_id}" value="${esc(studentLabel(student))}" placeholder="选择入住学生" readonly><input type="hidden" name="occupant_${bed.bed_id}" data-bed-student-id="${bed.bed_id}" value="${student?esc(student.user_id):''}"></label><div class="actions"><button type="button" class="secondary" data-bed-select="${bed.bed_id}">选择学生</button><button type="button" class="secondary" data-bed-clear="${bed.bed_id}">清空</button></div></div>`;
 }).join('');
 return `<div class="room-occupant-editor"><div class="room-occupant-grid">${beds||'<div class="empty">宿舍尚未建立床位</div>'}</div>${studentPickerMarkup(students)}</div>`;
}
function bindRoomOccupantPicker(dialog,roomBeds,students){
 let activeBedId='';
 const refresh=bindStudentPicker(dialog,students,student=>{
  if(!activeBedId){notify('请先选择床位对应的学生输入框',true);return;}
  const hidden=dialog.querySelector(`[data-bed-student-id="${activeBedId}"]`),display=dialog.querySelector(`[data-bed-target="${activeBedId}"]`);
  hidden.value=student.user_id;display.value=studentLabel(student);refresh();
 },student=>roomBeds.some(bed=>String(bed.bed_id)!==activeBedId&&dialog.querySelector(`[data-bed-student-id="${bed.bed_id}"]`)?.value===String(student.user_id)));
 const activate=id=>{
  activeBedId=String(id);
  dialog.querySelectorAll('[data-bed-choice]').forEach(item=>item.classList.toggle('is-active',item.dataset.bedChoice===activeBedId));
  refresh();
 };
 dialog.querySelectorAll('[data-bed-target]').forEach(input=>input.addEventListener('focus',()=>activate(input.dataset.bedTarget)));
 dialog.querySelectorAll('[data-bed-select]').forEach(button=>button.onclick=()=>activate(button.dataset.bedSelect));
 dialog.querySelectorAll('[data-bed-clear]').forEach(button=>button.onclick=()=>{
  activate(button.dataset.bedClear);
  dialog.querySelector(`[data-bed-student-id="${activeBedId}"]`).value='';
  dialog.querySelector(`[data-bed-target="${activeBedId}"]`).value='';
  refresh();
 });
}
function roomOccupantsPayload(form,roomBeds){
 const occupants=roomBeds.map(bed=>({bedId:Number(bed.bed_id),studentId:form.elements[`occupant_${bed.bed_id}`].value||null}));
 const selected=occupants.map(x=>x.studentId).filter(Boolean);
 if(new Set(selected).size!==selected.length)throw new Error('同一学生不能选择多个床位');
 return occupants;
}
function bindRoomEditOccupants(dialog,roomBeds,students){
 dialog.classList.add('room-edit-dialog');
 const form=dialog.querySelector('form'),main=dialog.querySelector('[data-room-edit-main]'),adjustment=dialog.querySelector('[data-room-edit-occupants]');
 const submit=dialog.querySelector('.dialog-footer [type="submit"]'),summary=dialog.querySelector('[data-room-beds-summary]');
 let previous=[];
 const values=()=>roomBeds.map(bed=>[bed.bed_id,form.elements[`occupant_${bed.bed_id}`].value]);
 const restore=items=>items.forEach(([bedId,studentId])=>{form.elements[`occupant_${bedId}`].value=studentId;const student=students.find(x=>String(x.user_id)===studentId);form.elements[`occupantDisplay_${bedId}`].value=studentLabel(student);});
 const showMain=()=>{adjustment.hidden=true;main.hidden=false;submit.hidden=false;};
 dialog.querySelector('[data-room-occupants]').onclick=()=>{previous=values();main.hidden=true;adjustment.hidden=false;submit.hidden=true;};
 dialog.querySelector('[data-room-occupants-cancel]').onclick=()=>{restore(previous);showMain();};
 dialog.querySelector('[data-room-occupants-save]').onclick=()=>{
  try{
   roomOccupantsPayload(form,roomBeds);
   const draftBeds=roomBeds.map(bed=>{
    const student=students.find(x=>String(x.user_id)===form.elements[`occupant_${bed.bed_id}`].value);
    return {...bed,student_id:student?.user_id||null,student_no:student?.student_no||null,student_name:student?.real_name||null,grade:student?.grade||null,major_name:student?.major_name||null};
   });
   summary.innerHTML=roomBedsTable(draftBeds);bindTablePagination(dialog);showMain();
  }catch(error){notify(error.message,true);}
 };
}
function studentsEligibleForBed(bed,students){
 return students.filter(student=>{
  const currentBed=Number(student.current_bed_id)===Number(bed.bed_id);
  const sameRoom=student.current_building===bed.building_name&&String(student.current_room)===String(bed.room_no);
  const assignable=!student.current_building&&Number(student.enabled)===1&&student.enrollment_status==='ENROLLED';
  return(currentBed||sameRoom||assignable)&&genderMatches(student.gender,bed.room_gender_limit);
 });
}
function bedOccupantSummary(student){
 if(!student)return '<div class="empty">当前床位暂无入住学生</div>';
 return table([{...student,grade_label:gradeLabel(student.grade)}],[['student_no','学号'],['real_name','姓名'],['grade_label','年级'],['major_name','专业']],null,'user_id');
}
function bedOccupantEditor(bed,students){
 const student=students.find(x=>Number(x.user_id)===Number(bed.student_id));
 return `<section class="detail-section bed-occupant-editor"><div class="toolbar"><h3>入住学生</h3><button type="button" class="secondary" data-bed-occupants>调整入住学生</button></div><div data-bed-occupant-summary>${bedOccupantSummary(student)}</div></section>`;
}
function bedOccupantAdjustment(bed,students){
 const student=students.find(x=>Number(x.user_id)===Number(bed.student_id));
 return `<div data-bed-edit-occupants hidden><div class="toolbar"><h3>调整入住学生</h3></div><div class="room-occupant-choice"><label class="field"><span>床位入住学生</span><input type="text" data-bed-student-display value="${esc(studentLabel(student))}" placeholder="选择入住学生" readonly><input type="hidden" name="studentId" value="${student?esc(student.user_id):''}" data-bed-student-id></label><div class="actions"><button type="button" class="secondary" data-bed-student-select>选择学生</button><button type="button" class="secondary" data-bed-student-clear>清空</button></div></div><div data-bed-student-picker></div><div class="actions room-occupant-edit-actions"><button type="button" class="secondary" data-bed-occupants-cancel>取消调整</button><button type="button" class="primary" data-bed-occupants-save>保存调整</button></div></div>`;
}
function bindBedEditOccupants(dialog,bed,students){
 dialog.classList.add('room-edit-dialog');
 const form=dialog.querySelector('form'),main=dialog.querySelector('[data-bed-edit-main]'),adjustment=dialog.querySelector('[data-bed-edit-occupants]');
 const submit=dialog.querySelector('.dialog-footer [type="submit"]'),summary=dialog.querySelector('[data-bed-occupant-summary]');
 const hidden=dialog.querySelector('[data-bed-student-id]'),display=dialog.querySelector('[data-bed-student-display]'),pickerHost=dialog.querySelector('[data-bed-student-picker]');
 let previous={id:hidden.value,label:display.value};
 const targetBed=()=>{
  const room=(state.data.rooms||[]).find(item=>String(item.room_id)===String(form.elements.roomId.value));
  return room?{...bed,...room,building_name:room.building_name,room_gender_limit:room.gender_limit}:null;
 };
 const showMain=()=>{adjustment.hidden=true;main.hidden=false;submit.hidden=false;};
 const renderPicker=()=>{
  const target=targetBed(),eligible=target?studentsEligibleForBed(target,students):[];
  pickerHost.innerHTML=studentPickerMarkup(eligible);
  let refresh=()=>{};
  refresh=bindStudentPicker(dialog,eligible,student=>{hidden.value=student.user_id;display.value=studentLabel(student);refresh();});
  dialog.querySelector('[data-bed-student-select]').onclick=()=>dialog.querySelector('[name="pickerName"]')?.focus();
  dialog.querySelector('[data-bed-student-clear]').onclick=()=>{hidden.value='';display.value='';refresh();};
 };
 dialog.querySelector('[data-bed-occupants]').onclick=()=>{
  previous={id:hidden.value,label:display.value};main.hidden=true;adjustment.hidden=false;submit.hidden=true;renderPicker();
 };
 dialog.querySelector('[data-bed-occupants-cancel]').onclick=()=>{hidden.value=previous.id;display.value=previous.label;showMain();};
 dialog.querySelector('[data-bed-occupants-save]').onclick=()=>{
  const selected=students.find(student=>String(student.user_id)===hidden.value);
  const target=targetBed();
  if(hidden.value&&(!target||!studentsEligibleForBed(target,students).some(student=>String(student.user_id)===hidden.value))){notify('所选学生不符合该床位的入住条件',true);return;}
  summary.innerHTML=bedOccupantSummary(selected);bindTablePagination(dialog);showMain();
 };
}
async function roomOccupantsDialog(room){
 const [students,beds]=await Promise.all([api('/admin/users?roleCode=STUDENT'),api('/beds')]);
 const roomBeds=beds.filter(x=>Number(x.room_id)===Number(room.room_id)),eligible=studentsEligibleForRoom(room,students);
 const editor=`${roomOccupantsEditor(roomBeds,eligible)}<div class="actions room-occupant-edit-actions"><button type="button" class="secondary" data-room-occupants-cancel>取消调整</button></div>`;
 const dialog=modal(`调整 ${room.room_no} 宿舍入住学生`,editor,(data,form)=>put(`/admin/rooms/${room.room_id}/occupants`,{occupants:roomOccupantsPayload(form,roomBeds)}),'保存调整');
 dialog.classList.add('room-edit-dialog');
 dialog.querySelector('.room-occupant-edit-actions').append(dialog.querySelector('.dialog-footer [type="submit"]'));
 dialog.querySelector('[data-room-occupants-cancel]').onclick=()=>dialog.close();
 bindRoomOccupantPicker(dialog,roomBeds,eligible);
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
 const rows=await api(`/admin/users?${params}`);state.data.users=rows;state.data.userExportRows??={};state.data.userExportRows[page]=rows;
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
 const tools=button(students?'新增学生':managers?'新增宿管':'新增维修人员','user-new')+(students?button('分配/调整宿舍','assign')+button('住宿历史','student-accommodation-history'):managers?button('配置负责楼栋','manager-scope-select'):button('配置维修范围','worker-scope-select'))+button('批量导入','import','users')+button('批量导出','user-export')+button('批量删除','user-delete-selected');
 const rowsForTable=rows.map(row=>({...row,current_room_label:row.current_building?`${row.current_building} · ${row.current_room} · ${row.current_bed}`:'未分配',manager_buildings:row.manager_buildings?.replace(/,\s*/g,'\n'),work_types:row.work_types?.replace(/,\s*/g,'\n'),repairer_buildings:row.repairer_buildings?.replace(/,\s*/g,'\n')}));
  const directoryTable=selectableTable(rowsForTable,columns,actions,page);
 return `<section class="panel"><div class="toolbar"><h3>${title}</h3><div class="actions">${tools}</div></div><form id="user-filter-form" class="filter-grid ${students?'student-filter-grid':managers?'manager-filter-grid':'repairer-filter-grid'}" data-page="${page}">${filterFields}<div class="filter-actions"><button class="primary" type="submit">查询</button>${button('清空筛选','user-filter-reset')}<label class="gender-switch"><span>男</span><input type="checkbox" role="switch" data-gender-toggle ${gender==='FEMALE'?'checked':''} aria-label="切换显示性别"><span>女</span><input type="hidden" name="gender" value="${gender}"></label></div></form>${directoryTable}</section>`;
}
function selectableTable(rows,columns,actions,page){
 return selectableRowsTable(rows,columns,actions,'user_id',`users-${page}`).replace('class="table-wrap table-component bulk-table"',`class="table-wrap table-component bulk-table role-table role-table-${page}"`);
}
function selectableAdminTable(rows,columns,actions,idKey,type){return table(rows,columns,actions,idKey).replace('<thead><tr>','<thead><tr><th class="select-col"><input type="checkbox" data-resource-select-all aria-label="全选记录"></th>').replace(/(<tr data-row-id="([^"]*)"[^>]*>)/g,(_,row,id)=>`${row}<td class="select-col"><input type="checkbox" data-resource-select-row value="${esc(id)}" aria-label="选择记录"></td>`).replace('<div class="table-wrap table-component"',`<div class="table-wrap table-component resource-table" data-resource-type="${type}"`);}
function combo(name,label,items,value=''){const listId=`filter-${name}`;return `<label class="field"><span>${label}</span><input name="${name}" type="search" list="${listId}" value="${esc(value)}" autocomplete="off"><datalist id="${listId}">${unique(items).map(item=>`<option value="${esc(item)}"></option>`).join('')}</datalist></label>`;}
function unique(items){return [...new Set(items.filter(x=>x!=null&&String(x).trim()!=='' ).map(String))].sort((a,b)=>a.localeCompare(b,'zh-CN'));}
export function checkboxChoices(name,items,selected=[],titleOverride=''){const chosen=new Set([...selected].map(String)),title=titleOverride||(name==='buildingIds'?'负责楼栋':'维修工种'),allSelected=name==='buildingIds'&&items.length>0&&chosen.size===items.length,labels=[...chosen].map(id=>items.find(([value])=>String(value)===id)?.[1]).filter(Boolean);return `<fieldset class="choice-group"><legend>${title}</legend><details class="checkbox-dropdown"><summary><span class="checkbox-dropdown-value">${allSelected?'全部楼栋':labels.map(esc).join('、')||'请选择'+title}</span></summary><div class="checkbox-dropdown-menu">${items.map(([id,label])=>`<label><span>${esc(label)}</span><input type="checkbox" name="${name}" value="${esc(id)}" ${chosen.has(String(id))?'checked':''}></label>`).join('')||'<span class="muted">暂无可选项</span>'}</div></details></fieldset>`;}
export function bindChoiceDropdown(dialog){dialog.querySelectorAll('.checkbox-dropdown').forEach(dropdown=>dropdown.addEventListener('change',()=>{const inputs=[...dropdown.querySelectorAll('input[type="checkbox"]')],labels=inputs.filter(input=>input.checked).map(input=>input.closest('label').querySelector('span').textContent),allSelected=inputs[0]?.name==='buildingIds'&&inputs.length>0&&labels.length===inputs.length;dropdown.querySelector('.checkbox-dropdown-value').textContent=allSelected?'全部楼栋':labels.join('、')||'请选择'+dropdown.closest('.choice-group').querySelector('legend').textContent;}));}
function checkedValues(form,name){return [...form.querySelectorAll(`input[name="${name}"]:checked`)].map(input=>Number(input.value));}
function selectedUserIds(){return [...document.querySelectorAll('.role-table [data-bulk-select-row]:checked')].map(input=>Number(input.value));}
function genderMatches(gender,limit){return limit==='混合'||(gender==='MALE'&&limit==='男生')||(gender==='FEMALE'&&limit==='女生');}
function refillSelect(element,placeholder,items,selected=''){element.innerHTML=`<option value="">${placeholder}</option>`+items.map(([value,label])=>`<option value="${esc(value)}" ${String(value)===String(selected)?'selected':''}>${esc(label)}</option>`).join('');}
export function cascadeResourceFilters(form,changedName){
 const type=form.dataset.resourceFilter;if(!['rooms','beds'].includes(type))return;
 const building=form.elements.buildingId,floor=form.elements.floorNo,room=form.elements.roomId,bedNo=form.elements.bedNo;
 if(changedName==='buildingId'){floor.value='';room.value='';if(bedNo)bedNo.value='';}
 if(changedName==='floorNo'){room.value='';if(bedNo)bedNo.value='';}
 const buildingId=building?.value||'',floorNo=floor?.value||'';
 const roomRows=(state.data.rooms||[]).filter(x=>(!buildingId||String(x.building_id)===buildingId)&&(!floorNo||String(x.floor_no)===floorNo));
 const floors=unique((state.data.rooms||[]).filter(x=>!buildingId||String(x.building_id)===buildingId).map(x=>x.floor_no)).sort((a,b)=>Number(a)-Number(b));
 if(floor)refillSelect(floor,'全部楼层',floors.map(x=>[x,`${x}层`]),floorNo);
 if(room)refillSelect(room,'全部宿舍',roomRows.map(x=>[x.room_id,buildingId?x.room_no:`${x.building_name} · ${x.room_no}`]),room.value);
 if(bedNo){
  const roomId=room?.value||'';
  const bedRows=(state.data.beds||[]).filter(x=>(!buildingId||String(x.building_id)===buildingId)&&(!floorNo||String(x.floor_no)===floorNo)&&(!roomId||String(x.room_id)===roomId));
  refillSelect(bedNo,'全部床位号',unique(bedRows.map(x=>x.bed_no)).map(x=>[x,x]),bedNo.value);
 }
}
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
 if(action==='dictionary-enabled'){const type=b.dataset.type,rows=type==='work-types'?state.data.config.workTypes:state.data.config.categories,key=type==='work-types'?'work_type_id':'category_id',row=rows.find(x=>String(x[key])===id);if(!row)return;const enabled=Number(row.enabled)!==1;const payload=type==='work-types'?{name:row.work_type_name,enabled}:{name:row.category_name,workTypeId:row.work_type_id,enabled};await put(`/admin/dictionaries/${type}/${id}`,payload);await render();return;}
 if(action==='dictionary-delete'){const type=b.dataset.type,label=type==='work-types'?'维修工种':'故障分类';modal(`删除${label}`,'有关联维修人员、故障分类或工单记录时无法删除。',()=>api(`/admin/dictionaries/${type}/${id}`,{method:'DELETE'}),'确认删除');return;}
 if(['log-delete','log-delete-selected','backup-delete','backup-delete-selected'].includes(action)){const logs=action.startsWith('log-'),type=logs?'logs':'backups',ids=action.endsWith('-selected')?[...document.querySelectorAll(`.resource-table[data-resource-type="${type}"] [data-resource-select-row]:checked`)].map(input=>Number(input.value)):[Number(id)];if(!ids.length){notify('请先勾选要删除的记录',true);return;}modal(logs?'删除操作日志':'删除备份记录',`确定删除选中的 ${ids.length} 条记录？`,()=>api(logs?'/admin/operation-logs':'/admin/backup-tasks',{method:'DELETE',body:JSON.stringify({ids})}),'确认删除');return;}
 if(action==='backup-download-selected'){
  const selected=[...document.querySelectorAll('.resource-table[data-resource-type="backups"] [data-resource-select-row]:checked')].map(input=>Number(input.value));
  if(!selected.length)throw new Error('请先勾选要下载的备份记录');
  const available=(state.data.backups||[]).filter(row=>selected.includes(Number(row.task_id))&&row.file_id).map(row=>Number(row.task_id));
  if(!available.length)throw new Error('选中的备份均未生成 SQL 文件');
  const response=await fetch(`${API}/admin/backup-tasks/download`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${state.token}`},body:JSON.stringify({ids:available})});
  if(!response.ok){let message='批量下载失败';try{message=(await response.json()).message||message;}catch{}throw new Error(message);}
  const url=URL.createObjectURL(await response.blob()),link=document.createElement('a');link.href=url;link.download='数据库备份.zip';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);return;
 }
 if(['export-homes','export-accommodation-history'].includes(action)){const rows=state.page==='accommodationHistory'||state.page==='studentAccommodationHistory'?state.data.accommodationHistoryExportRows||[]:state.data.homeExportRows||state.data.homes||[],type=state.page==='accommodationHistory'||state.page==='studentAccommodationHistory'?`accommodation-history-${state.page}`:'accommodation-current';download('住宿记录.json',selectedRows(type,rows,'assignment_id'));return;}
 if(action==='accommodation-filter-reset'){delete state.data.homeFilters;await render();return;}
 if(action==='student-accommodation-history'){
  const ids=selectedUserIds();
  const students=state.data.users.filter(row=>ids.includes(Number(row.user_id)));
  state.data.studentAccommodationHistoryStudentIds=ids;
  state.data.studentAccommodationHistoryStudentNames=students.map(row=>row.real_name);
  state.page='studentAccommodationHistory';
  await render();
  return;
 }
 if(action==='student-accommodation-history-back'){state.page='students';await render();return;}
 if(action==='accommodation-history-filter-reset'){
  if(state.data.accommodationHistoryFilters)delete state.data.accommodationHistoryFilters[state.page];
  await render();return;
 }
 if(action==='accommodation-history'){
  const history=await api('/accommodations/history');
  const historyRows=history.map(row=>({...row,grade_label:[row.enrollment_year?`${row.enrollment_year}级`:null,row.class_name].filter(Boolean).join(' ')}));
  const dialog=modal('住宿历史',`<label class="field search"><span>搜索学生、楼栋、宿舍或床位</span><input type="search" data-history-search></label>${table(historyRows,[['student_no','学号'],['student_name','姓名'],['building_name','楼栋'],['room_no','宿舍'],['bed_no','床位'],['check_in_date','入住日期'],['check_out_date','退宿日期']],null,'assignment_id')}`,null);
  dialog.querySelector('[data-history-search]').oninput=event=>filterTableComponents(event.target.value.trim(),dialog);
  return;
 }
 if(action==='resource-export'){const rows=state.data.resourceExportRows?.[id]||state.data[id]||[];download(`${resourceConfig[id]?.title||id}.json`,selectedRows(id,rows,resourceConfig[id]?.id||'id'));return;}
 if(action==='user-export'){const rows=state.data.userExportRows?.[state.page]||state.data.users||[];download('角色资料.json',selectedRows(`users-${state.page}`,rows,'user_id'));return;}
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
  if(d.role_code==='REPAIRER')html+=`<section class="detail-section"><h3>维修人员资料</h3><dl class="detail-grid"><div><dt>在岗状态</dt><dd>${Number(d.profile.on_duty)?'在岗':'离岗'}</dd></div><div><dt>最大在办工单</dt><dd>${esc(d.profile.max_active_orders??'不限')}</dd></div><div><dt>维修工种</dt><dd>${stacked(d.workTypes.map(x=>x.work_type_name))}</dd></div><div><dt>负责楼栋</dt><dd>${stacked(d.buildings.map(x=>x.building_name))}</dd></div></dl></section><div class="detail-record-actions">${recordButton('查看历史维修与评价','repairs')}</div>`;
  const dialog=modal(`${roleLabels[d.role_code]}详情`,`<div class="user-detail-content">${html}</div>`,null);bindDetailRecords(dialog,d,html);return;}
 if(action==='user-toggle'){const row=state.data.users.find(x=>String(x.user_id)===id);await put(`/admin/users/${id}/enabled`,{enabled:!row.enabled});await render();notify('账号状态已更新');return;}
 if(action==='user-delete-selected'){
  const ids=selectedUserIds();if(!ids.length){notify('请先勾选要删除的账号',true);return;}
  modal('批量删除账号',`确认处理选中的 ${ids.length} 个账号？有业务历史的账号会停用并保留记录，没有业务历史的账号会被删除。`,async()=>{const result=await api('/admin/users',{method:'DELETE',body:JSON.stringify({ids})});return `已删除 ${result.deletedCount} 个账号，停用并保留历史 ${result.disabledCount} 个账号`;},'确认处理');return;
 }
 if(action==='user-delete'){modal('删除或停用账号','有业务历史的账号将停用并保留记录；没有业务记录的账号会被删除。',async()=>{const deleted=await api(`/admin/users/${id}`,{method:'DELETE'});return deleted?'账号已删除':'账号存在业务记录，已停用并保留历史';},'确认');return;}
 if(action==='manager-scope'){await managerScopeDialog(id);return;}
 if(action==='resource-new'||action==='resource-edit'){
  const type=action==='resource-new'?id:b.dataset.type;
  const row=action==='resource-edit'?state.data[type].find(x=>String(x[{buildings:'building_id',rooms:'room_id',beds:'bed_id'}[type]])===id):{};
  const roomBeds=type==='rooms'&&action==='resource-edit'?state.data.beds.filter(x=>Number(x.room_id)===Number(id)):[];
  const roomStudents=type==='rooms'&&action==='resource-edit'?await api('/admin/users?roleCode=STUDENT'):[];
  const bedStudents=type==='beds'&&action==='resource-edit'?await api('/admin/users?roleCode=STUDENT'):[];
  let fields='';
  if(type==='buildings')fields=field('buildingCode','楼栋编号','text',row.building_code||'')+field('buildingName','楼栋名称','text',row.building_name||'')+field('address','地址','text',row.address||'')+select('genderLimit','性别限制',[['男生','男生'],['女生','女生'],['混合','混合']],row.gender_limit);
  if(type==='rooms'){
   const building=state.data.buildings.find(x=>Number(x.building_id)===Number(row.building_id));
   const genderOptions=building?.gender_limit==='混合'?[['男生','男生'],['女生','女生']]:[[building?.gender_limit||'男生',building?.gender_limit||'男生']];
   const buildingField=action==='resource-edit'?field('buildingName','所属楼栋','text',row.building_name||'',false).replace('<input ','<input readonly '):select('buildingId','楼栋',state.data.buildings.map(x=>[x.building_id,x.building_name]),'',false,true);
   fields=buildingField+field('roomNo','宿舍号','text',row.room_no||'')+field('floorNo','楼层','number',row.floor_no||1)+field('designCapacity','床位数','number',row.design_capacity||4)+select('genderLimit','性别限制',genderOptions,row.gender_limit||genderOptions[0][0]);
  }
  if(type==='beds'){
   const selectedBuilding=row.building_id||'';
   const roomOptions=state.data.rooms.filter(x=>!selectedBuilding||Number(x.building_id)===Number(selectedBuilding)).map(x=>[x.room_id,`${x.floor_no}层 ${x.room_no}`]);
   fields=select('buildingId','楼栋',state.data.buildings.map(x=>[x.building_id,x.building_name]),selectedBuilding,false,true)+select('roomId','宿舍',roomOptions,row.room_id||'',false,true)+field('bedNo','床位号','text',row.bed_no||'')+select('managementStatus','管理状态',[['AVAILABLE','正常使用'],['DISABLED','停用']],row.management_status||'AVAILABLE');
  }
  const roomEdit=type==='rooms'&&action==='resource-edit';
  const roomEligible=roomEdit?studentsEligibleForRoom(row,roomStudents):[];
  const roomOccupants=roomEdit?`<div data-room-edit-main><div class="edit-grid resource-edit-grid">${fields}</div>${roomBedsSection(roomBeds)}</div><div data-room-edit-occupants hidden><div class="toolbar"><h3>调整入住学生</h3></div>${roomOccupantsEditor(roomBeds,roomEligible)}<div class="actions room-occupant-edit-actions"><button type="button" class="secondary" data-room-occupants-cancel>取消调整</button><button type="button" class="primary" data-room-occupants-save>保存调整</button></div></div>`:'';
  const bedEdit=type==='beds'&&action==='resource-edit'?`<div data-bed-edit-main><div class="edit-grid resource-edit-grid">${fields}</div>${bedOccupantEditor(row,bedStudents)}</div>${bedOccupantAdjustment(row,bedStudents)}`:'';
  const html=roomEdit?roomOccupants:type==='beds'&&action==='resource-edit'?bedEdit:`<div class="edit-grid resource-edit-grid">${fields}</div>${type==='buildings'&&action==='resource-edit'?buildingRoomsPanel(id,true):''}`;
  const dialog=modal(`${action==='resource-edit'?'编辑':'新增'}${resourceConfig[type].title}`,html,(data,form)=>{
   if(type==='rooms'&&action==='resource-edit')data.occupants=roomOccupantsPayload(form,roomBeds);
   if(type==='beds'&&action==='resource-edit')data.studentId=form.elements.studentId.value||null;
   return action==='resource-edit'?put(`/admin/resources/${type}/${id}`,data):post(`/admin/resources/${type}`,data);
  });
  if(type==='buildings'&&action==='resource-edit')dialog.classList.add('building-edit-dialog');
  if(type==='buildings'&&action==='resource-edit')bindBuildingRooms(dialog,Number(id),true);
  if(type==='rooms'&&action==='resource-new'){
   const form=dialog.querySelector('form'),buildingField=form.elements.buildingId,genderField=form.elements.genderLimit;
   buildingField.onchange=()=>{const selected=state.data.buildings.find(x=>String(x.building_id)===buildingField.value),options=selected?.gender_limit==='混合'?[['男生','男生'],['女生','女生']]:[[selected?.gender_limit||'男生',selected?.gender_limit||'男生']];refillSelect(genderField,'',options,options[0][0]);};
  }
  if(roomEdit){bindRoomOccupantPicker(dialog,roomBeds,roomEligible);bindRoomEditOccupants(dialog,roomBeds,roomStudents);}
  if(type==='beds'&&action==='resource-edit'){
   bindBedEditOccupants(dialog,row,bedStudents);
   const form=dialog.querySelector('form'),buildingField=form.elements.buildingId,roomField=form.elements.roomId;
   buildingField.onchange=()=>{const options=state.data.rooms.filter(x=>String(x.building_id)===buildingField.value).map(x=>[x.room_id,`${x.floor_no}层 ${x.room_no}`]);refillSelect(roomField,'请选择宿舍',options,'');};
  }
  return;
 }
 if(action==='rule-edit'){const r=state.data.config.rule;modal('发布工单规则版本',[['accept_minutes','接单时限（分钟）'],['normal_minutes','普通维修时限（分钟）'],['urgent_minutes','紧急维修时限（分钟）'],['confirm_days','超时自动确认时间（天）'],['max_rework_count','重修上限（空值为不限）']].map(([key,label])=>field(key,label,'number',r[key]??'',key!=='max_rework_count')).join(''),d=>post('/admin/repair-rules',d));return;}
 if(action==='worker-edit'){await repairerScopeDialog(id);return;}
 if(action==='student-assign'){await assignmentDialog();return;}
 if(action==='dictionary-new'||action==='dictionary-edit'){const type=action==='dictionary-new'?id:b.dataset.type;const rows=type==='work-types'?state.data.config.workTypes:state.data.config.categories;const row=action==='dictionary-edit'?rows.find(x=>String(x[type==='work-types'?'work_type_id':'category_id'])===id):{};modal(type==='work-types'?'维修工种':'故障分类',(type==='work-types'&&action==='dictionary-new'?field('code','工种编号'):'')+field('name','名称','text',row.work_type_name||row.category_name||'')+(type==='categories'?select('workTypeId','维修工种',state.data.config.workTypes.map(x=>[x.work_type_id,x.work_type_name]),row.work_type_id):'')+check('enabled','启用',row.enabled!==0),d=>{d.enabled=!!d.enabled;return action==='dictionary-new'?post(`/admin/dictionaries/${type}`,d):put(`/admin/dictionaries/${type}/${id}`,d);});return;}
 if(action==='import'){const examples={users:[{account:'student2',studentNo:'2026000002',gender:'FEMALE',password:'123456',realName:'李同学',phone:'13800000000',roleCode:'STUDENT'}],buildings:[{buildingCode:'D-04',buildingName:'四号楼',address:'北区',genderLimit:'混合'}],rooms:[{buildingId:1,roomNo:'501',floorNo:5,designCapacity:4}],beds:[{roomId:1,bedNo:'E',managementStatus:'AVAILABLE'}],assignments:[{studentId:1,bedId:2}]};const dialog=modal('批量导入',`<div class="import-controls"><button type="button" class="secondary" id="import-template">下载 JSON 模板</button><label class="field"><span>JSON 数据文件</span><input name="importFile" type="file" accept="application/json,.json" required></label></div>`,async(d,f)=>{const form=new FormData();form.set('file',f.elements.importFile.files[0]);const file=await api('/admin/task-files',{method:'POST',body:form});await post('/admin/data-tasks',{taskType:'IMPORT',businessType:id,fileId:file.fileId});},'创建导入任务');dialog.classList.add('import-dialog');dialog.querySelector('#import-template').onclick=()=>download(id+'-template.json',examples[id]);return;}
 if(action==='backup'){await post('/admin/backup-tasks',{taskType:'BACKUP',businessType:id});await render();notify('SQL备份任务已受理');return;}
 if(action==='refresh-tasks'){await render();return;}
 if(action==='task-cancel'){await api('/admin/data-tasks/'+id,{method:'DELETE'});await render();return;}
 if(action==='task-download'){const response=await fetch(`${API}/files/${id}`,{headers:{Authorization:`Bearer ${state.token}`}});if(!response.ok)throw new Error('下载失败');download(b.dataset.name||'export.json',await response.text(),'application/octet-stream');return;}
 if(action==='task-detail'){const task=await api('/admin/data-tasks/'+id);const dialog=modal('任务详情',`<p>${esc(task.task_status)}</p><p>${esc(task.result_description||'')}</p>${task.files.filter(f=>f.file_purpose==='OUTPUT').map(f=>button('下载结果','task-download',f.file_id,`data-name="${esc(f.original_name)}"`)).join('')}`,null);dialog.querySelectorAll('[data-action]').forEach(btn=>btn.onclick=()=>adminAction('task-download',btn.dataset.id,btn));return;}
}
