// src/pages/Management/index.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { Row, Col, Card, Tabs, message, Button, Modal } from 'antd';
import {
  TeamOutlined,
  LockOutlined,
  CheckOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import StatsCard from './components/StatsCard';
import Toolbar from './components/Toolbar';
import UserTable, { User } from './components/UserTable';
import ResumeFieldPanel from './components/ResumeFieldPanel';
import RoleManager from './components/RoleManager';
import PromptPanel from './components/PromptPanel';

// 导入API
import {
  getAllUsers,
  getActiveRoles,
} from '@/api/manage/userRole';
import * as resumeApi from '@/api/manage/resumeEntry';

// 角色选项类型
export interface RoleOption {
  value: string;
  label: string;
  color?: string;
}

// 当前周期ID（可以从上下文或配置中获取）
const CURRENT_CYCLE_ID = 2;

const Management: React.FC = () => {
  const [activeTab, setActiveTab] = useState('users');
  const [activeConfigTab, setActiveConfigTab] = useState('resume');

  const [users, setUsers] = useState<User[]>([]);
  const [selectedRows, setSelectedRows] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const [resumeFields, setResumeFields] = useState<any[]>([]);
  const [fieldsLoading, setFieldsLoading] = useState(false);
  const [formPrompts, setFormPrompts] = useState<any[]>([]);
  const [roleOptions, setRoleOptions] = useState<RoleOption[]>([]);

  /** 拉取简历字段 */
  const fetchResumeFields = useCallback(async () => {
    setFieldsLoading(true);
    try {
      console.log('正在获取简历字段, cycleId:', CURRENT_CYCLE_ID);

      // 获取当前周期的所有字段
      const res = await resumeApi.getResumeFields(CURRENT_CYCLE_ID);
      console.log('简历字段返回数据:', res);

      // 检查返回的数据
      let fields = [];
      if (res && res.data) {
        // 如果返回的是 { data: [...] } 格式
        fields = res.data;
      } else if (Array.isArray(res)) {
        // 如果直接返回数组
        fields = res;
      }

      console.log('解析后的字段数据:', fields);

      if (fields && fields.length > 0) {
        // 有数据，转换为前端组件需要的格式
        const formattedFields = fields.map((field: any) => ({
          fieldId: field.fieldId,
          cycleId: field.cycleId,
          fieldKey: field.fieldKey,
          fieldLabel: field.fieldLabel,
          isRequired: field.isRequired,
          isActive: field.isActive,
          sortOrder: field.sortOrder,
          fieldType: mapFieldType(field.fieldKey),
        }));

        console.log('格式化后的字段:', formattedFields);
        setResumeFields(formattedFields);
      } else {
        console.log('没有获取到字段数据，尝试初始化默认字段');
        // 没有数据，初始化默认字段
        await handleInitDefaultFields();
      }
    } catch (error) {
      console.error('获取简历字段失败:', error);
      message.error('获取简历字段失败，尝试初始化默认字段');

      // 出错时也尝试初始化
      await handleInitDefaultFields();
    } finally {
      setFieldsLoading(false);
    }
  }, []);

  /** 初始化默认字段 */
  const handleInitDefaultFields = async () => {
    try {
      console.log('正在初始化默认字段...');
      // 调用初始化接口
      const initRes = await resumeApi.initResumeFields(CURRENT_CYCLE_ID);
      console.log('初始化结果:', initRes);

      message.success('已初始化默认简历字段');

      // 初始化后重新获取
      setTimeout(async () => {
        try {
          const res = await resumeApi.getResumeFields(CURRENT_CYCLE_ID);
          console.log('初始化后重新获取:', res);

          let fields = [];
          if (res && res.data) {
            fields = res.data;
          } else if (Array.isArray(res)) {
            fields = res;
          }

          if (fields && fields.length > 0) {
            const formattedFields = fields.map((field: any) => ({
              fieldId: field.fieldId,
              cycleId: field.cycleId,
              fieldKey: field.fieldKey,
              fieldLabel: field.fieldLabel,
              isRequired: field.isRequired,
              isActive: field.isActive,
              sortOrder: field.sortOrder,
              fieldType: mapFieldType(field.fieldKey),
            }));
            setResumeFields(formattedFields);
          } else {
            // 如果还是没数据，使用前端默认字段
            console.log('使用前端默认字段');
            setResumeFields(resumeApi.DEFAULT_RESUME_FIELDS.map((field, index) => ({
              ...field,
              fieldType: mapFieldType(field.fieldKey),
              sortOrder: index + 1,
            })));
          }
        } catch (e) {
          console.error('重新获取字段失败:', e);
          // 降级使用前端默认字段
          setResumeFields(resumeApi.DEFAULT_RESUME_FIELDS.map((field, index) => ({
            ...field,
            fieldType: mapFieldType(field.fieldKey),
            sortOrder: index + 1,
          })));
        }
      }, 500); // 给后端一点处理时间
    } catch (error) {
      console.error('初始化默认字段失败:', error);
      message.error('初始化失败，使用前端默认配置');

      // 降级方案：使用前端定义的默认字段
      setResumeFields(resumeApi.DEFAULT_RESUME_FIELDS.map((field, index) => ({
        ...field,
        fieldType: mapFieldType(field.fieldKey),
        sortOrder: index + 1,
      })));
    }
  };

  // 根据fieldKey映射字段类型（前端展示用）
  const mapFieldType = (fieldKey: string): string => {
    const typeMap: Record<string, string> = {
      'personal_photo': 'custom',
      'self_introduction': 'textarea',
      'tech_stack': 'textarea',
      'project_experience': 'textarea',
      'gender': 'radio',
      'expected_department': 'select',
    };
    return typeMap[fieldKey] || 'input';
  };

  /** 拉取用户列表 */
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res: any = await getAllUsers();
      console.log('用户原始数据:', res);
      const list = res?.data?.content || (Array.isArray(res?.data) ? res.data : []);
      setUsers(list);
    } catch (e) {
      console.error(e);
      message.error('获取用户列表失败');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  /** 拉取可分配角色列表 */
  const fetchRoleOptions = async () => {
    try {
      const res: any = await getActiveRoles();
      const serverRoles = res?.data || res || [];
      const options: RoleOption[] = (Array.isArray(serverRoles) ? serverRoles : []).map(
        (r: any): RoleOption => ({
          value: String(r.id || r.roleId),
          label: r.name || r.roleName,
        }),
      );
      setRoleOptions(options);
    } catch (e) {
      console.error(e);
      message.error('获取角色列表失败');
      setRoleOptions([]);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchRoleOptions();
    fetchResumeFields(); // 初始化时获取简历字段
  }, [fetchResumeFields]);

  /** 查看用户详情 */
  const handleViewUser = (user: User) => {
    console.log('查看用户详情', user);
  };

  /** 保存简历字段 - 增量更新（更新存在、创建新增、删除多余） */
  const handleSaveResumeFields = async (fields: any[]) => {
    try {
      console.log('准备保存的字段:', fields);
      
      if (fields.length === 0) {
        message.warning('至少需要一个字段');
        return;
      }
      
      // 1. 获取后端现有的所有字段
      const existingRes = await resumeApi.getResumeFields(CURRENT_CYCLE_ID);
      let existingFields: any[] = [];
      if (existingRes && existingRes.data) {
        existingFields = existingRes.data;
      } else if (Array.isArray(existingRes)) {
        existingFields = existingRes;
      }
      
      console.log('后端现有字段数量:', existingFields.length);
      console.log('前端字段数量:', fields.length);
      
      // 2. 创建后端现有字段的 Map (fieldId -> field)
      const existingFieldMap = new Map();
      existingFields.forEach(field => {
        existingFieldMap.set(field.fieldId, field);
      });
      
      // 3. 创建前端字段的 Set (用于标记哪些字段还存在)
      const frontendFieldIds = new Set();
      
      // 4. 分离前端字段：更新和新增
      const updateFields: any[] = [];
      const createFields: any[] = [];
      
      fields.forEach(field => {
        if (field.fieldId && field.fieldId > 0 && existingFieldMap.has(field.fieldId)) {
          // 已存在的字段，需要更新
          updateFields.push(field);
          frontendFieldIds.add(field.fieldId);
        } else {
          // 新字段，需要创建
          createFields.push(field);
        }
      });
      
      // 5. 找出需要删除的字段（后端有但前端没有的）
      const deleteFields: any[] = [];
      existingFields.forEach(field => {
        if (!frontendFieldIds.has(field.fieldId)) {
          deleteFields.push(field);
        }
      });
      
      console.log('待更新字段数量:', updateFields.length);
      console.log('待新增字段数量:', createFields.length);
      console.log('待删除字段数量:', deleteFields.length);
      
      // 6. 删除多余的字段
      if (deleteFields.length > 0) {
        console.log('开始删除多余字段...');
        let deleteSuccessCount = 0;
        let deleteFailCount = 0;
        
        for (const field of deleteFields) {
          try {
            await resumeApi.deleteResumeField(field.fieldId);
            console.log(`✅ 删除字段成功: ${field.fieldLabel} (ID: ${field.fieldId})`);
            deleteSuccessCount++;
          } catch (error) {
            console.error(`❌ 删除字段失败: ${field.fieldLabel} (ID: ${field.fieldId})`, error);
            deleteFailCount++;
          }
        }
        
        if (deleteFailCount > 0) {
          message.warning(`删除字段失败: ${deleteFailCount} 个`);
        } else if (deleteSuccessCount > 0) {
          console.log(`删除完成，共删除 ${deleteSuccessCount} 个字段`);
        }
      }
      
      // 7. 批量更新已存在的字段
      if (updateFields.length > 0) {
        const updateData = updateFields.map((field, index) => ({
          fieldId: field.fieldId,
          cycleId: CURRENT_CYCLE_ID,
          fieldKey: field.fieldKey,
          fieldLabel: field.fieldLabel,
          isRequired: field.isRequired,
          isActive: field.isActive,
          sortOrder: field.sortOrder || index + 1,
          category:field.category || 1,
        }));
        
        console.log('批量更新数据:', updateData.map(f => ({ id: f.fieldId, label: f.fieldLabel, sortOrder: f.sortOrder })));
        await resumeApi.batchUpdateResumeFields(updateData);
        console.log('批量更新成功');
      }
      
      // 8. 逐个创建新字段
      if (createFields.length > 0) {
        console.log('开始创建新字段...');
        let createSuccessCount = 0;
        let createFailCount = 0;
        
        for (let i = 0; i < createFields.length; i++) {
          const field = createFields[i];
          try {
            await resumeApi.createResumeField({
              cycleId: CURRENT_CYCLE_ID,
              fieldKey: field.fieldKey,
              fieldLabel: field.fieldLabel,
              isRequired: field.isRequired,
              isActive: field.isActive,
              sortOrder: field.sortOrder || updateFields.length + i + 1,
            });
            console.log(`✅ 创建字段成功: ${field.fieldLabel}`);
            createSuccessCount++;
          } catch (error) {
            console.error(`❌ 创建字段失败: ${field.fieldLabel}`, error);
            createFailCount++;
          }
        }
        
        if (createFailCount > 0) {
          message.warning(`创建字段失败: ${createFailCount} 个`);
        } else if (createSuccessCount > 0) {
          console.log(`创建完成，共创建 ${createSuccessCount} 个字段`);
        }
      }
      
      // 显示最终结果
      const totalUpdate = updateFields.length;
      const totalCreate = createFields.length;
      const totalDelete = deleteFields.length;
      
      if (totalDelete > 0) {
        message.success(`保存成功！更新 ${totalUpdate} 个，新增 ${totalCreate} 个，删除 ${totalDelete} 个`);
      } else if (totalCreate > 0) {
        message.success(`保存成功！更新 ${totalUpdate} 个，新增 ${totalCreate} 个`);
      } else if (totalUpdate > 0) {
        message.success(`保存成功！更新 ${totalUpdate} 个字段`);
      } else {
        message.success('保存成功');
      }
      
      // 重新获取最新数据
      setTimeout(async () => {
        await fetchResumeFields();
      }, 500);
      
    } catch (error: any) {
      console.error('保存失败详情:', error);
      message.error('保存失败: ' + (error?.message || '请重试'));
    }
  };

  /** 手动重置为默认字段 */
  const handleResetToDefault = () => {
    console.log('重置为默认字段');
    const defaultFields = resumeApi.DEFAULT_RESUME_FIELDS.map((field, index) => ({
      ...field,
      fieldType: mapFieldType(field.fieldKey),
      sortOrder: index + 1,
    }));
    setResumeFields(defaultFields);
    message.info('已加载默认字段配置，点击保存按钮生效');
  };

  return (
    <div className="management-page">
      {/* 统计卡片 */}
      <Row gutter={[24, 24]} className="stats-row">
        <Col xs={24} sm={12} md={6}>
          <StatsCard
            icon={<TeamOutlined style={{ fontSize: 24 }} />}
            value={users.length}
            title="总用户数"
            bgColor="rgba(77,166,255,0.1)"
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <StatsCard
            icon={<LockOutlined style={{ fontSize: 24 }} />}
            value={users.filter((u) => u.status === false).length}
            title="冻结账户"
            bgColor="rgba(255,77,79,0.1)"
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <StatsCard
            icon={<CheckOutlined style={{ fontSize: 24 }} />}
            value={users.filter((u) => u.isMember === false).length}
            title="非社员/待审核"
            bgColor="rgba(82,196,26,0.1)"
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <StatsCard
            icon={<AppstoreOutlined style={{ fontSize: 24 }} />}
            value={users.filter((u) => u.isMember === true).length}
            title="社员人数"
            bgColor="rgba(250,140,22,0.1)"
          />
        </Col>
      </Row>

      <Card className="main-card">
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'users',
              label: '用户管理',
              children: (
                <>
                  <Toolbar
                    searchText=""
                    onSearchChange={() => { }}
                    selectedStatus="all"
                    onStatusChange={() => { }}
                    statusOptions={[]}
                    selectedRowsCount={selectedRows.length}
                    onBatchAdmit={() => { }}
                    onClearSelection={() => setSelectedRows([])}
                  />
                  <UserTable
                    users={users}
                    loading={loading}
                    roleOptions={roleOptions}
                    selectedRows={selectedRows}
                    onSelectionChange={setSelectedRows}
                    onView={handleViewUser}
                    refreshUsers={fetchUsers}
                  />
                </>
              ),
            },
            {
              key: 'roles',
              label: '角色管理',
              children: <RoleManager />,
            },
            {
              key: 'resume',
              label: '简历设置',
              children: (
                <Tabs
                  activeKey={activeConfigTab}
                  onChange={setActiveConfigTab}
                  items={[
                    {
                      key: 'resume',
                      label: '简历字段',
                      children: (
                        <ResumeFieldPanel
                          cycleId={CURRENT_CYCLE_ID}
                          fields={resumeFields}
                          onSave={handleSaveResumeFields}
                          onFieldsChange={setResumeFields}
                          onResetToDefault={handleResetToDefault}
                          fieldTypeOptions={[
                            { value: 'input', label: '文本框' },
                            { value: 'textarea', label: '多行文本' },
                            { value: 'radio', label: '单选' },
                            { value: 'checkbox', label: '多选' },
                            { value: 'select', label: '下拉选择' },
                            { value: 'custom', label: '照片' },
                          ]}
                        />
                      ),
                    },
                    {
                      key: 'prompt',
                      label: '报名提示',
                      children: (
                        <PromptPanel
                          prompts={formPrompts}
                          onSave={setFormPrompts}
                        />
                      ),
                    },
                  ]}
                />
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
};

export default Management;