const { request, clearSession, showError } = require('../../utils/request');
Page({
 data:{loading:true,profile:{},editing:false,form:{},oldPassword:'',newPassword:'',genderOptions:['未填写','MALE','FEMALE']},
 onShow(){if(getApp().requireRole(['STUDENT','DORM_MANAGER','REPAIRER','ADMIN']))this.load();},
 async load(){this.setData({loading:true});try{const profile=await request('/profile');this.setData({profile,form:{phone:profile.phone||'',gender:profile.gender||'',birthDate:profile.birth_date||''}});}catch(e){showError(e);}finally{this.setData({loading:false});}},
 input(e){this.setData({[`form.${e.currentTarget.dataset.key}`]:e.detail.value});},
 toggleEdit(){this.setData({editing:true});},
 cancelEdit(){this.setData({editing:false});},
 genderChange(e){const values=['','MALE','FEMALE'];this.setData({'form.gender':values[Number(e.detail.value)]});},
 birthChange(e){this.setData({'form.birthDate':e.detail.value});},
 passwordInput(e){this.setData({[e.currentTarget.dataset.key]:e.detail.value});},
 async save(){try{await request('/profile',{method:'PUT',data:this.data.form});wx.showToast({title:'资料已保存'});this.setData({editing:false});this.load();}catch(e){showError(e);}},
 async changePassword(){const {oldPassword,newPassword}=this.data;if(!oldPassword||newPassword.length<6){wx.showToast({title:'请输入原密码和至少 6 位新密码',icon:'none'});return;}try{await request('/profile/password',{method:'PUT',data:{oldPassword,newPassword}});wx.showToast({title:'密码已修改，请重新登录',icon:'none'});clearSession();setTimeout(()=>wx.reLaunch({url:'/pages/login/index'}),800);}catch(e){showError(e);}},
 logout(){wx.showModal({title:'退出登录',content:'确定退出当前账号吗？',success:async r=>{if(!r.confirm)return;try{await request('/auth/logout',{method:'POST'});}catch(e){}finally{clearSession();wx.reLaunch({url:'/pages/login/index'});}}});}
});
