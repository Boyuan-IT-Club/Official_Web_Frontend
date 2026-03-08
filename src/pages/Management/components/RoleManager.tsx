import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Button, Space, Modal, Checkbox, Tag, message, Empty, Tooltip } from 'antd';
import { PlusOutlined, SafetyCertificateOutlined, EditOutlined, DeleteOutlined, TeamOutlined } from '@ant-design/icons';
// 导入你提供的接口
import * as roleApi from '@/api/manage/roleControl';
import * as permissionApi from '@/api/manage/rolePermission';

interface Role {
  roleId: number;
  roleName: string;
  roleCode: string;
  description?: string;
  status: number;
}

const RoleManager: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  
  // 弹窗控制
  const [permModalVisible, setPermModalVisible] = useState(false);
  const [batchModalVisible, setBatchModalVisible] = useState(false);
  const [currentRole, setCurrentRole] = useState<Role | null>(null);
  
  // 权限数据（假设的权限列表，实际应从接口获取）
  const [allPermissions] = useState([
    { label: '查看简历', value: 1 },
    { label: '修改简历', value: 2 },
    { label: '删除简历', value: 3 },
    { label: '用户管理', value: 4 },
  ]);
  const [selectedPerms, setSelectedPerms] = useState<number[]>([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([]);

  // 1. 初始化获取数据
  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    setLoading(true);
    try {
      const res = await roleApi.getRoles();
      setRoles(res.data || []); // 假设返回结构中有 data
    } catch (err) {
      message.error('加载角色失败');
    } finally {
      setLoading(false);
    }
  };

  // 2. 处理单个权限分配
  const openPermissionModal = async (role: Role) => {
    setCurrentRole(role);
    try {
      // 获取当前角色已有的权限ID
      const res = await permissionApi.getRolePermissionIds(role.roleId);
      setSelectedPerms(res.data || []);
      setPermModalVisible(true);
    } catch (err) {
      message.error('获取权限详情失败');
    }
  };

  const handleSavePermissions = async () => {
    if (!currentRole) return;
    try {
      // 调用分配权限接口
      await permissionApi.addPermissionToRole(currentRole.roleId, selectedPerms[0]); // 示例只传了一个，实际通常是传数组
      message.success(`角色 [${currentRole.roleName}] 权限更新成功`);
      setPermModalVisible(false);
    } catch (err) {
      message.error('权限分配失败');
    }
  };

  return (
    <div style={{ padding: '24px', background: '#f5f5f5', minHeight: '100vh' }}>
      {/* 顶部工具栏：批量分配在右上角 */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <h2 style={{ margin: 0 }}>角色权限管理</h2>
        </Col>
        <Col>
          <Space>
            <Button 
              icon={<TeamOutlined />} 
              onClick={() => setBatchModalVisible(true)}
            >
              批量分配权限
            </Button>
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={() => message.info('跳转创建角色页面')}
            >
              新增角色
            </Button>
          </Space>
        </Col>
      </Row>

      {/* 角色卡片列表 */}
      <Row gutter={[16, 16]}>
        {roles.map((role) => (
          <Col xs={24} sm={12} md={8} lg={6} key={role.roleId}>
            <Card
              hoverable
              actions={[
                <Tooltip title="编辑角色"><EditOutlined key="edit" /></Tooltip>,
                <Tooltip title="分配权限"><SafetyCertificateOutlined key="perm" onClick={() => openPermissionModal(role)} /></Tooltip>,
                <Tooltip title="删除"><DeleteOutlined key="delete" style={{ color: '#ff4d4f' }} /></Tooltip>,
              ]}
            >
              <Card.Meta
                title={<span>{role.roleName} <Tag color="blue">{role.roleCode}</Tag></span>}
                description={role.description || '暂无描述'}
              />
              <div style={{ marginTop: 16 }}>
                状态：{role.status === 1 ? <Tag color="green">启用</Tag> : <Tag color="red">禁用</Tag>}
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* 单个权限分配弹窗 */}
      <Modal
        title={`分配权限 - ${currentRole?.roleName}`}
        open={permModalVisible}
        onOk={handleSavePermissions}
        onCancel={() => setPermModalVisible(false)}
        destroyOnClose
      >
        <Checkbox.Group 
          options={allPermissions} 
          value={selectedPerms} 
          onChange={(values) => setSelectedPerms(values as number[])} 
        />
      </Modal>

      {/* 批量分配弹窗 */}
      <Modal
        title="批量分配权限"
        open={batchModalVisible}
        onOk={() => {
          message.success('批量分配成功');
          setBatchModalVisible(false);
        }}
        onCancel={() => setBatchModalVisible(false)}
      >
        <div style={{ marginBottom: 16 }}>
          <p>第一步：选择目标角色</p>
          <Checkbox.Group onChange={(v) => setSelectedRoleIds(v as number[])}>
            <Row>
              {roles.map(r => (
                <Col span={12} key={r.roleId}>
                  <Checkbox value={r.roleId}>{r.roleName}</Checkbox>
                </Col>
              ))}
            </Row>
          </Checkbox.Group>
        </div>
        <hr />
        <div style={{ marginTop: 16 }}>
          <p>第二步：赋予统一权限</p>
          <Checkbox.Group options={allPermissions} />
        </div>
      </Modal>

      {roles.length === 0 && !loading && <Empty description="暂无角色数据" />}
    </div>
  );
};

export default RoleManager;