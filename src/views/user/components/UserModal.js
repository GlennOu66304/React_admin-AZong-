import React, { Component } from "react";
// ant
import { Modal, message, Checkbox } from "antd";
// API
import { UserAdd, UserDetailed, UserEdit } from "@/api/user";
import { GetRoles } from "@/api/permission";
// 组件
import FormCom from "@c/form/Index";
// 检验
import { validate_phone, validate_pass } from "@/utils/validate";
// 加密
import CryptoJs from 'crypto-js';
class UserModal extends Component {
    constructor(props){
        super(props);
        const _this = this;
        this.state = {
            isModalVisible: false,
            user_id: "",
            // 角色权限选项
            role_options: [],
            // 角色的值 
            role_value: [],
            password_rules: [
                ({getFieldValue}) => ({
                    validator(rule, value) {
                        if(_this.state.user_id && !value && !getFieldValue("passwords")) {
                            return Promise.resolve();
                        }
                        if (validate_pass(value)) {
                            return Promise.resolve();
                        }
                        return Promise.reject('密码不正确格式有误');
                    },
                })
            ],
            passwords_rules: [
                ({getFieldValue}) => ({
                    validator(rule, value) {
                        // 编辑状态并且当前的值为空时，直接通过
                        if(_this.state.user_id && !value && !getFieldValue("password")) {
                            return Promise.resolve();
                        }
                        if(!validate_pass(value)) {
                            return Promise.reject('密码不正确格式有误');
                        }
                        if (getFieldValue('password') !== value) {
                            return Promise.reject('两次密码不相同');
                        }
                        return Promise.resolve();
                    },
                })
            ],
            formConfig: {
                url: "jobAdd",
                editKey: "",
                initValue: {
                    number: 0,
                    status: "",
                    parentId: ""
                },
                setFieldValue: {},
                formatFormKey: "parentId"
            },
            formLayout: {
                labelCol: { span: 4 },
                wrapperCol: { span: 20 }
            },
            formItem: [
                { 
                    type: "Input",
                    label: "用户名", 
                    name: "username", 
                    required: true, 
                    style: { width: "200px" },
                    placeholder: "请输入邮箱"
                },
                { 
                    type: "Input",
                    value_type: "password",
                    label: "密码", 
                    name: "password", 
                    upload_field: true,
                    trigger: ['onBlur'],
                    style: { width: "200px" },
                    placeholder: "请输入密码",
                    rules: ""
                },
                { 
                    type: "Input",
                    value_type: "password",
                    label: "确认密码", 
                    name: "passwords", 
                    upload_field: true,
                    trigger: ['onBlur'],
                    style: { width: "200px" },
                    placeholder: "请再次输入密码",
                    rules: ""
                },
                { 
                    type: "Input",
                    label: "真实姓名", 
                    name: "truename", 
                    required: true, 
                    style: { width: "200px" },
                    placeholder: "请输入真实姓名"
                },
                { 
                    type: "Input",
                    label: "手机号", 
                    name: "phone",
                    required: true,
                    placeholder: "请输入11位数字的手机号",
                    rules: [
                        () => ({
                            validator(rule, value) {
                                if (validate_phone(value)) { return Promise.resolve(); }
                                return Promise.reject('手机号格式有误');
                            },
                        })
                    ]
                },
                { 
                    type: "Radio",
                    label: "禁启用", 
                    name: "status", 
                    required: true,
                    options: [
                        { label: "禁用", value: false },
                        { label: "启用", value: true },
                    ]
                },
                { 
                    type: "Slot",
                    label: "权限", 
                    name: "role", 
                    required: true,
                    slotName: "role"
                }
            ]
        };
    }

    componentDidMount(){
        this.props.onRef(this);
    }

    onFormRef = (ref) => {
        this.child = ref;
    }

    /** 修改数组对象 */
    updateArrayItem = (index, key) => {
        this.setState({
            formItem: this.state.formItem.map((item, _index) => index.includes(_index)  ? {...item, ...key[_index]} : item)
        })
    }

    updateItem = (id) => {
        this.updateArrayItem(
            [1, 2], 
            {
                1: { rules: id ? "" : this.state.password_rules },
                2: { rules: id ? "" : this.state.passwords_rules }
            }
        );
    }
   

    /** 弹窗 */
    visibleModal = (params) => {
        this.setState({
            isModalVisible: params.status,
            user_id: params.user_id
        }, () => {
            this.getDetailed();
            this.updateItem(params.user_id);
            console.log(this.state)
        })
        // 获取
        this.getRoles()
    }

    getRoles = () => {
        GetRoles().then(response => {
            this.setState({
                role_options: response.data.data
            })
        })
    }

    /** 用户详情 */
    getDetailed = () => {
        if(!this.state.user_id) { return false; }
        UserDetailed({id: this.state.user_id}).then(response => {
            const data = response.data.data;
            this.setState({
                formConfig: {
                    setFieldValue: data
                },
                role_value: data.role ? data.role.split(",") : []    //  user,information,produce => ["user", "information", "produce"]
            })
        })
    }

    onBlurEvent = (e) => {
        const value = e.currentTarget.value;
        if(value) {
            this.updateItem(value ? false : true);
            return false;
        }
    }

    handleCancel = () => {
        // 清单表单
        this.child.onReset();
        this.visibleModal(false);
    }

    submit = (value) => {
        this.state.user_id ? this.handlerFormEdit(value) : this.handlerFormAdd(value);
        
    }

    handlerFormAdd= (value) => {
        const requestData = value;
        requestData.password = CryptoJs.MD5(value.password).toString();
        delete requestData.passwords;
        UserAdd(requestData).then(response => {
            const responseData = response.data;
            // 提示
            message.info(responseData.message);
            // 关闭弹准备
            this.handleCancel(false);
        })
    }
    handlerFormEdit= (value) => {
        // 密码
        const password = value.password;
        const passwords = value.passwords;
        if(password) {
            if(!validate_pass(password)) {
                message.info("请输入6~20位的英文+数字的密码");
                return false;
            }
        }
        if(passwords) {
            if(!validate_pass(passwords)) {
                message.info("请输入6~20位的英文+数字的确认密码");
                return false;
            }
        }
        if((password && passwords) || (password && !passwords) || (!password && passwords)){
            if(password !== passwords) {
                message.info("两次密码不致");
                return false;
            }
        }

        const requestData = value;
        requestData.id = this.state.user_id;
        // 权限
        requestData.role = this.state.role_value.join();  // ["user", "information"] => user,information
        if(password) {
            requestData.password = CryptoJs.MD5(value.password).toString();
            delete requestData.passwords;
        }
        
        UserEdit(requestData).then(response => {
            const responseData = response.data;
            // 提示
            message.info(responseData.message);
            // 关闭弹准备
            this.handleCancel(false);
        })
    }

    onChangeRole = (value) => {
        this.setState({
            role_value: value
        })
    }

    

    render(){
        return (
            <Modal title="新增用户" visible={this.state.isModalVisible} footer={null} onCancel={this.handleCancel}>
                <FormCom onRef={this.onFormRef} onBlur={this.onBlurEvent} formItem={this.state.formItem} formLayout={this.state.formLayout} formConfig={this.state.formConfig} submit={this.submit}>
                    <div ref="role">
                    <Checkbox.Group
                        options={this.state.role_options}
                        value={this.state.role_value}
                        onChange={this.onChangeRole}
                    />
                    </div>
                </FormCom>
            </Modal>
        )
    }
}
export default UserModal;